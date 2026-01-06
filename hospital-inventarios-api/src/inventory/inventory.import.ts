import { Router } from "express";
import multer from "multer";
import XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { authGuard } from "../auth/auth.middleware.js";
import { prisma } from "../prisma.js"; // <- ajusta si tu prisma está en otro path

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const inventoryImportRouter = Router();

function asString(v: any) {
    return String(v ?? "").trim();
}

function asUpper(v: any) {
    return asString(v).toUpperCase();
}

function asDateISO(v: any) {
    if (!v) return null;

    if (v instanceof Date && !isNaN(v.getTime())) return v;

    const s = asString(v);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return new Date(`${s}T00:00:00`);
}

function asNumber(v: any) {
    const s = asString(v);
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

inventoryImportRouter.post(
    "/inventario/import-excel",
    authGuard,
    upload.single("file"),
    async (req, res) => {
        // ✅ Permisos (ajusta si quieres otros roles)
        const role = String((req as any).user?.role || "").toUpperCase();
        if (!["ADMIN", "CONTROL_PATRIMONIAL"].includes(role)) {
            return res.status(403).json({ error: "No autorizado para importar." });
        }

        if (!req.file) return res.status(400).json({ error: "Falta archivo (field: file)." });

        const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
        const ws = wb.Sheets["Plantilla"] || wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const errores: { fila: number; error: string }[] = [];
        const creados: { fila: number; id: number; no_inventario: string }[] = [];

        // ✅ cache catálogos
        const [clasifs, ubs, ests, provs] = await Promise.all([
            prisma.clasificacionBien.findMany(),
            prisma.ubicacion.findMany(),
            prisma.estadoFisico.findMany(),
            prisma.proveedor.findMany(),
        ]);

        const clasifBySigla = new Map(clasifs.map(c => [String(c.sigla).toUpperCase(), c]));
        const ubByCode = new Map(ubs.map(u => [String(u.code).toUpperCase(), u]));
        const estByLabel = new Map(ests.map(e => [String(e.label).toUpperCase(), e]));
        const provByRfc = new Map(provs.map(p => [String(p.rfc || "").toUpperCase(), p]));
        const provByName = new Map(provs.map(p => [String(p.nombre || "").toUpperCase(), p]));

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const filaExcel = i + 2; // asumiendo headers en fila 1

            const no_inventario = asString(r["no_inventario*"] || r["no_inventario"]);
            const nombre = asString(r["nombre*"] || r["nombre"]);
            const responsable = asString(r["responsable*"] || r["responsable"]);
            const rfc = asUpper(r["rfc*"] || r["rfc"]);

            if (!no_inventario || !nombre || !responsable || !rfc) {
                errores.push({ fila: filaExcel, error: "Faltan obligatorios (no_inventario, nombre, responsable, rfc)." });
                continue;
            }

            // enums (defaults)
            const tipo = asUpper(r["tipo"]) || "ADMINISTRATIVO";
            const categoria = asUpper(r["categoria"]) || "GENERAL";
            const tipoPropiedad = asUpper(r["tipoPropiedad"]) || null;

            // relaciones por keys amigables
            const sigla = asUpper(r["clasificacion_sigla"]);
            const clasif = sigla ? clasifBySigla.get(sigla) : null;

            const ubCode = asUpper(r["ubicacion_code"]);
            const ubicacion = ubCode ? ubByCode.get(ubCode) : null;

            const estLabel = asUpper(r["estado_fisico"]);
            const estado = estLabel ? estByLabel.get(estLabel) : null;

            const provRfc = asUpper(r["proveedor_rfc"]);
            const provName = asUpper(r["proveedor_nombre"]);
            const proveedor = provRfc ? provByRfc.get(provRfc) : (provName ? provByName.get(provName) : null);

            const fecha_adjudicacion = asDateISO(r["fecha_adjudicacion"]);
            const fecha_entrega = asDateISO(r["fecha_entrega"]);

            const costoN = asNumber(r["costo_adquisicion"]);
            const costoDecimal = costoN != null ? new Prisma.Decimal(costoN) : null;

            const fotoUrl = asString(r["fotoUrl"]) || null;

            try {
                const userId = (req as any).user?.id ? Number((req as any).user.id) : null;

                const created = await prisma.inventoryItem.create({
                    data: {
                        no_inventario,
                        nombre,
                        responsable,
                        rfc,

                        tipo: tipo as any,
                        categoria: categoria as any,

                        clasificacionId: clasif?.id ?? null,
                        ubicacionId: ubicacion?.id ?? null,
                        estadoId: estado?.id ?? null,
                        proveedorId: proveedor?.id ?? null,

                        no_factura: asString(r["no_factura"]) || null,
                        fecha_adjudicacion,
                        fecha_entrega,
                        costo_adquisicion: costoDecimal,

                        marca: asString(r["marca"]) || null,
                        modelo: asString(r["modelo"]) || null,
                        no_serie: asString(r["no_serie"]) || null,

                        tipoPropiedad: (tipoPropiedad || undefined) as any,

                        fotoUrl: asString(r["fotoUrl"]) || null,
                        observaciones: asString(r["observaciones"]) || null,

                        // ✅ siempre borrador al importar
                        estadoLogico: "BORRADOR",

                        // ✅ quién importó el bien
                        createdById: userId,

                        // ✅ crea resguardo BORRADOR “snapshot”
                        resguardos: {
                            create: {
                                estado: "BORRADOR",
                                responsable,
                                rfc,
                                ubicacionId: ubicacion?.id ?? null,
                                creadoPorId: userId,
                            },
                        },
                    },
                });

                creados.push({ fila: filaExcel, id: created.id, no_inventario });
            } catch (e: any) {
                // ejemplo típico: Unique constraint (no_inventario duplicado)
                errores.push({ fila: filaExcel, error: e?.message || "Error al insertar fila" });
            }
        }

        return res.json({
            ok: true,
            creados: creados.length,
            errores,
            detalle: creados,
        });
    }
);
