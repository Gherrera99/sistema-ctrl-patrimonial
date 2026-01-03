// hospital-inventarios-api/src/inventory/inventory.ctrl.ts
import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { TipoBien } from '@prisma/client';
import { MovimientosService } from '../movimientos/movimientos.service.js';
import { TipoMovimiento } from '@prisma/client';


/** Util: parsea fechas (yyyy-mm-dd ó dd/mm/yyyy) a Date o undefined */
function asDate(v?: string | null): Date | undefined {
  if (!v) return undefined;
  // si viene dd/mm/yyyy lo viramos a yyyy-mm-dd
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  const iso = m ? `${m[3]}-${m[2]}-${m[1]}` : v;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}

/** GET /api/inventario  (listado + filtros básicos opcionales) */
export async function list(req: Request, res: Response) {
  const { q, responsable, ubicacionId, tipo, estadoId } = req.query;

  const where: any = {};
  if (q && String(q).trim()) {
    where.OR = [
      { no_inventario: { contains: String(q) } },
      { nombre: { contains: String(q) } },
      { responsable: { contains: String(q) } },
    ];
  }
  if (responsable) where.responsable = { contains: String(responsable) };
  if (ubicacionId) where.ubicacionId = Number(ubicacionId);
  if (estadoId) where.estadoId = Number(estadoId);
  if (tipo) where.tipo = String(tipo).toUpperCase() as TipoBien;

  const items = await prisma.inventoryItem.findMany({
    where,
    include: {
      estado: { select: { id: true, code: true, label: true, orden: true } },
      ubicacion: { select: { id: true, code: true, nombre: true, orden: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  res.json(items);
}

/** GET /api/inventario/:id */
export async function getOne(req: Request, res: Response) {
  const id = Number(req.params.id);
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      estado: { select: { id: true, code: true, label: true, orden: true } },
      ubicacion: { select: { id: true, code: true, nombre: true, orden: true } },
    },
  });
  if (!item) return res.status(404).json({ error: 'No encontrado' });
  res.json(item);
}

/** POST /api/inventario */
export async function create(req: Request, res: Response) {
  // 👀 Log para depurar qué llega realmente
  console.log('[inventario.create] body =', req.body);

    const {
        no_inventario,
        nombre,
        responsable,
        rfc,
        no_factura,
        fecha_adjudicacion,
        modelo,
        categoria,
        marca,
        no_serie,
        observaciones,
        fecha_entrega,
        estadoId,
        ubicacionId,
        tipo,
        costo_adquisicion,
        proveedorId,
        tipoPropiedad,
    } = req.body || {};

    if (!no_inventario || !nombre) {
    return res.status(400).json({ error: 'no_inventario y nombre son obligatorios' });
  }

  try {
    const created = await prisma.inventoryItem.create({
      data: {
        no_inventario: String(no_inventario),
        nombre: String(nombre),
        responsable: responsable ? String(responsable) : '',
        rfc: rfc ? String(rfc) : '',
        no_factura: no_factura ? String(no_factura) : null,
        fecha_adjudicacion: asDate(fecha_adjudicacion),
        modelo: modelo || null,
        marca: marca || null,
        no_serie: no_serie || null,
        observaciones: observaciones || null,
        fecha_entrega: asDate(fecha_entrega),

        categoria: categoria
           ? (String(categoria).toUpperCase() as any) // GENERAL | INFORMATICA
           : undefined,


          // enum
        tipo: (String(tipo || 'ADMINISTRATIVO').toUpperCase() as TipoBien),

        // relaciones (usar nested connect para evitar error de Prisma)
        ...(estadoId ? { estado: { connect: { id: Number(estadoId) } } } : {}),
        ...(ubicacionId ? { ubicacion: { connect: { id: Number(ubicacionId) } } } : {}),

        // quién creó (relación correcta)
        ...(req as any).user?.id
          ? { createdBy: { connect: { id: Number((req as any).user.id) } } }
          : {},

        costo_adquisicion:
            costo_adquisicion !== undefined && costo_adquisicion !== null && String(costo_adquisicion).trim() !== ''
               ? Number(costo_adquisicion)
               : null,

          tipoPropiedad: tipoPropiedad
          ? (String(tipoPropiedad).toUpperCase() as any)
          : undefined,

        ...(proveedorId
           ? { proveedor: { connect: { id: Number(proveedorId) } } }
           : {}),

      },
      include: {
        estado: { select: { id: true, code: true, label: true, orden: true } },
        ubicacion: { select: { id: true, code: true, nombre: true, orden: true } },
      },
    });

    return res.status(201).json(created);
  } catch (e: any) {
    console.error('[inventario.create] error', e);
    return res.status(400).json({ error: 'No se pudo crear', detail: e?.message || String(e) });
  }
}

/** PUT /api/inventario/:id */
export async function update(req: Request, res: Response) {
    const id = Number(req.params.id);

    const {
        no_inventario,
        nombre,
        responsable,
        rfc,
        no_factura,
        fecha_adjudicacion,
        modelo,
        categoria,
        marca,
        no_serie,
        observaciones,
        fecha_entrega,

        // 🎯 nuevos campos
        costo_adquisicion,
        tipoPropiedad,
        proveedorId,

        estadoId,
        ubicacionId,
        tipo,
    } = req.body || {};


    try {
        // 1) Cargamos la versión ANTERIOR del bien
        const before = await prisma.inventoryItem.findUnique({
            where: { id },
            include: {
                ubicacion: true,
                estado: true,
            }
        });

        if (!before) {
            return res.status(404).json({ error: 'No encontrado' });
        }

        // 2) Actualizamos el bien
        const updated = await prisma.inventoryItem.update({
            where: { id },
            data: {
                ...(no_inventario !== undefined ? { no_inventario: String(no_inventario) } : {}),
                ...(nombre !== undefined ? { nombre: String(nombre) } : {}),
                ...(responsable !== undefined ? { responsable: String(responsable) } : {}),
                ...(rfc !== undefined ? { rfc: String(rfc) } : {}),
                ...(no_factura !== undefined ? { no_factura: no_factura ? String(no_factura) : null } : {}),
                ...(fecha_adjudicacion !== undefined ? { fecha_adjudicacion: asDate(fecha_adjudicacion) } : {}),
                ...(modelo !== undefined ? { modelo: modelo || null } : {}),
                ...(marca !== undefined ? { marca: marca || null } : {}),
                ...(no_serie !== undefined ? { no_serie: no_serie || null } : {}),
                ...(observaciones !== undefined ? { observaciones: observaciones || null } : {}),
                ...(fecha_entrega !== undefined ? { fecha_entrega: asDate(fecha_entrega) } : {}),
                ...(tipo !== undefined ? { tipo: (String(tipo).toUpperCase() as TipoBien) } : {}),

                ...(categoria !== undefined
                    ? { categoria: String(categoria).toUpperCase() as any }
                    : {}),

                ...(estadoId !== undefined
                    ? estadoId
                        ? { estado: { connect: { id: Number(estadoId) } } }
                        : { estado: { disconnect: true } }
                    : {}),

                ...(ubicacionId !== undefined
                    ? ubicacionId
                        ? { ubicacion: { connect: { id: Number(ubicacionId) } } }
                        : { ubicacion: { disconnect: true } }
                    : {}),

                ...(costo_adquisicion !== undefined
                    ? { costo_adquisicion: Number(costo_adquisicion) }
                    : {}),

                ...(tipoPropiedad !== undefined
                    ? { tipoPropiedad: String(tipoPropiedad).toUpperCase() as any }
                    : {}),

                ...(proveedorId !== undefined
                    ? proveedorId
                        ? { proveedor: { connect: { id: Number(proveedorId) } } }
                        : { proveedor: { disconnect: true } }
                    : {}),

            },
            include: {
                estado: true,
                ubicacion: true,
            },
        });

        // 3) REGISTRO AUTOMÁTICO DE MOVIMIENTOS
        const userId = (req as any).user?.id;
        const bienId = updated.id;

        // --- CAMBIO DE RESPONSABLE ---
        if (before.responsable !== updated.responsable) {
            await MovimientosService.registrarMovimiento({
                bienId,
                usuarioId: userId,
                tipo: "CAMBIO_RESPONSABLE",
                motivo: "Cambio de responsable",
                responsableAntes: before.responsable || "",
                responsableDespues: updated.responsable || "",
                ubicacionAntes: "",
                ubicacionDespues: "",
            });
        }

        // --- CAMBIO DE UBICACIÓN ---
        if (before.ubicacionId !== updated.ubicacionId) {
            // recuperar nombres si existen
            const ubicacionAntes = before.ubicacion?.nombre || "";
            const ubicacionDespues = updated.ubicacion?.nombre || "";

            await MovimientosService.registrarMovimiento({
                bienId,
                usuarioId: userId,
                tipo: "CAMBIO_UBICACION",
                motivo: "Cambio de ubicación",
                responsableAntes: "",
                responsableDespues: "",
                ubicacionAntes,
                ubicacionDespues,
            });
        }

        // --- CAMBIOS GENERALES DEL BIEN ---
        if (
            before.nombre !== updated.nombre ||
            before.modelo !== updated.modelo ||
            before.marca !== updated.marca ||
            before.no_serie !== updated.no_serie ||
            before.observaciones !== updated.observaciones
        ) {
            await MovimientosService.registrarMovimiento({
                bienId,
                usuarioId: userId,
                tipo: "OTRO",
                motivo: "Actualización de información del bien",
                responsableAntes: "",
                responsableDespues: "",
                ubicacionAntes: "",
                ubicacionDespues: "",
            });
        }

        return res.json(updated);

    } catch (e: any) {
        console.error('[inventario.update] error', e);
        res.status(400).json({ error: 'No se pudo actualizar', detail: e?.message || String(e) });
    }
}

/** DELETE /api/inventario/:id */
export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    await prisma.inventoryItem.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    console.error('[inventario.remove] error', e);
    res.status(400).json({ error: 'No se pudo eliminar', detail: e?.message || String(e) });
  }
}
