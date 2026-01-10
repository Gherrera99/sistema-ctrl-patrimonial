// hospital-inventarios-api/src/inventory/inventory.ctrl.ts
import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import {
    CategoriaBien,
    EstadoBienLogico,
    EstadoResguardo,
    Role,
    TipoArchivoBien,
    TipoArchivoResguardo,
    TipoBien,
    TipoMovimiento,
} from '@prisma/client';
import { MovimientosService } from '../movimientos/movimientos.service.js';

/** Util: parsea fechas (yyyy-mm-dd ó dd/mm/yyyy) a Date o undefined */
function asDate(v?: string | null): Date | undefined {
    if (!v) return undefined;
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
    const iso = m ? `${m[3]}-${m[2]}-${m[1]}` : v;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? undefined : d;
}

function auth(req: Request) {
    const u = (req as any).user || {};
    const userId = u?.id ? Number(u.id) : null;
    const role = String(u?.role || '') as Role;
    return { userId, role };
}

// const rawPersonalId = req.body?.personalId;
// const personalIdNum =
//     rawPersonalId !== undefined && rawPersonalId !== null && String(rawPersonalId).trim() !== ''
//         ? Number(rawPersonalId)
//         : null;
//
// const pSnap = await resolvePersonalSnapshot(personalIdNum);


async function resolvePersonalSnapshot(personalId: any) {
    if (!personalId) return null;

    const id = Number(personalId);
    if (!id || Number.isNaN(id)) return null;

    const p = await prisma.personal.findUnique({ where: { id } });
    if (!p || !p.activo) return null;

    return {
        personalId: p.id,
        nombre: p.nombre,
        rfc: p.rfc,
        puesto: p.puesto,
    };
}

async function getCurrentResguardo(bienId: number) {
    // ✅ Prioridad: BORRADOR (cuando hay cambio de responsable)
    const borrador = await prisma.resguardoBien.findFirst({
        where: { bienId, estado: 'BORRADOR' as any },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { archivos: { orderBy: { uploadedAt: 'desc' } } },
    });
    if (borrador) return borrador;

    // ✅ Si no hay BORRADOR, usamos el ACTIVO
    return prisma.resguardoBien.findFirst({
        where: { bienId, estado: 'ACTIVO' as any },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { archivos: { orderBy: { uploadedAt: 'desc' } } },
    });
}

/**
 * Resguardo "actual" para subir archivos:
 * - Preferimos BORRADOR si existe (para firmados)
 * - Si no hay BORRADOR, usamos ACTIVO
 */
async function getResguardoPreferBorrador(bienId: number) {
    const borrador = await prisma.resguardoBien.findFirst({
        where: { bienId, estado: EstadoResguardo.BORRADOR },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { archivos: { orderBy: { uploadedAt: 'desc' } } },
    });
    if (borrador) return borrador;

    return prisma.resguardoBien.findFirst({
        where: { bienId, estado: EstadoResguardo.ACTIVO },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { archivos: { orderBy: { uploadedAt: 'desc' } } },
    });
}

export async function listClasificaciones(req: Request, res: Response) {
    const rows = await prisma.clasificacionBien.findMany({
        orderBy: [{ sigla: "asc" }],
        select: { id: true, sigla: true, nombre: true },
    });
    res.json(rows);
}

/** GET /api/inventario  (listado + filtros) */
export async function list(req: Request, res: Response) {
    const { q, responsable, ubicacionId, tipo, estadoId, estadoLogico, categoria } = req.query;

    // paginación
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20))); // límite 100
    const usePagination = req.query.page !== undefined || req.query.pageSize !== undefined;

    const where: any = {};

    if (estadoLogico) where.estadoLogico = String(estadoLogico).toUpperCase() as EstadoBienLogico;
    if (categoria) where.categoria = String(categoria).toUpperCase() as CategoriaBien;

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

    // modo legacy (sin paginación)
    if (!usePagination) {
        const items = await prisma.inventoryItem.findMany({
            where,
            include: {
                estado: { select: { id: true, code: true, label: true, orden: true } },
                ubicacion: { select: { id: true, code: true, nombre: true, orden: true } },
                // ✅ NUEVO
                proveedor: { select: { id: true, nombre: true, rfc: true } },
                clasificacion: { select: { id: true, sigla: true, nombre: true, cuenta: true } },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
        return res.json(items);
    }

    const skip = (page - 1) * pageSize;

    const [total, items] = await Promise.all([
        prisma.inventoryItem.count({ where }),
        prisma.inventoryItem.findMany({
            where,
            skip,
            take: pageSize,
            include: {
                estado: { select: { id: true, code: true, label: true, orden: true } },
                ubicacion: { select: { id: true, code: true, nombre: true, orden: true } },
                // ✅ NUEVO
                proveedor: { select: { id: true, nombre: true, rfc: true } },
                clasificacion: { select: { id: true, sigla: true, nombre: true, cuenta: true } },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return res.json({
        items,
        total,
        page,
        pageSize,
        totalPages,
    });
}

/** GET /api/inventario/:id  (detalle para modal) */
export async function getOne(req: Request, res: Response) {
    const id = Number(req.params.id);

    const item = await prisma.inventoryItem.findUnique({
        where: { id },
        include: {
            personal: { select: { id: true, nombre: true, rfc: true, puesto: true } },
            estado: { select: { id: true, code: true, label: true, orden: true } },
            ubicacion: { select: { id: true, code: true, nombre: true, orden: true } },
            proveedor: true,
            clasificacion: { select: { id: true, sigla: true, nombre: true, cuenta: true } },
            archivos: { orderBy: { uploadedAt: 'desc' } },
            resguardos: {
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                include: { archivos: { orderBy: { uploadedAt: 'desc' } }, ubicacion: true },
            },
            movimientos: { orderBy: { createdAt: 'desc' } },
        },
    });

    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
}

/** POST /api/inventario  (crea SIEMPRE en BORRADOR + crea Resguardo BORRADOR) */
export async function create(req: Request, res: Response) {
    const {
        no_inventario,
        nombre,
        responsable,
        clasificacionId,
        rfc,
        personalId,
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
        fotoUrl,
        foto,
    } = req.body || {};

    const { userId } = auth(req);

// ✅ si viene personalId, sobreescribe responsable/rfc desde catálogo
    const pSnap = await resolvePersonalSnapshot(personalId);

    const responsableFinal = pSnap ? pSnap.nombre : String(responsable || '').trim();
    const rfcFinal = pSnap ? pSnap.rfc : String(rfc || '').trim();
    const responsablePuestoFinal = pSnap ? pSnap.puesto : null;


    if (!no_inventario || !nombre) {
        return res.status(400).json({ error: 'no_inventario y nombre son obligatorios' });
    }
    if (!responsableFinal || !String(responsableFinal).trim()) {
        return res.status(400).json({ error: 'responsable es obligatorio' });
    }
    if (!rfcFinal || !String(rfcFinal).trim()) {
        return res.status(400).json({ error: 'rfc es obligatorio' });
    }

// si mandaron personalId pero no existe/inactivo:
    if (personalId && !pSnap) {
        return res.status(400).json({ error: 'personalId inválido o inactivo' });
    }

    try {
        const created = await prisma.inventoryItem.create({
            data: {
                no_inventario: String(no_inventario),
                nombre: String(nombre),
                responsable: String(responsableFinal),
                ...(clasificacionId ? { clasificacion: { connect: { id: Number(clasificacionId) } } } : {}),
                rfc: String(rfcFinal),
                no_factura: no_factura ? String(no_factura) : null,
                fecha_adjudicacion: asDate(fecha_adjudicacion),
                modelo: modelo || null,
                marca: marca || null,
                no_serie: no_serie || null,
                observaciones: observaciones || null,
                fecha_entrega: asDate(fecha_entrega),

                fotoUrl: (fotoUrl ?? foto) ? String(fotoUrl ?? foto).trim() : null,

                categoria: categoria ? (String(categoria).toUpperCase() as CategoriaBien) : undefined,
                tipo: (String(tipo || 'ADMINISTRATIVO').toUpperCase() as TipoBien),

                // ✅ inicia BORRADOR
                estadoLogico: EstadoBienLogico.BORRADOR,

                ...(estadoId ? { estado: { connect: { id: Number(estadoId) } } } : {}),
                ...(ubicacionId ? { ubicacion: { connect: { id: Number(ubicacionId) } } } : {}),
                ...(userId ? { createdBy: { connect: { id: Number(userId) } } } : {}),

                costo_adquisicion:
                    costo_adquisicion !== undefined &&
                    costo_adquisicion !== null &&
                    String(costo_adquisicion).trim() !== ''
                        ? Number(costo_adquisicion)
                        : null,

                tipoPropiedad: tipoPropiedad ? (String(tipoPropiedad).toUpperCase() as any) : undefined,
                ...(proveedorId ? { proveedor: { connect: { id: Number(proveedorId) } } } : {}),

                // ✅ crear resguardo BORRADOR inicial (SOLO connect, NO ids)
                resguardos: {
                    create: {
                        estado: EstadoResguardo.BORRADOR,
                        responsable: String(responsableFinal),
                        rfc: String(rfcFinal),
                        responsablePuesto: responsablePuestoFinal,
                        ...(pSnap ? { personal: { connect: { id: pSnap.personalId } } } : {}),
                        ...(userId ? { creadoPor: { connect: { id: Number(userId) } } } : {}),
                        ...(ubicacionId ? { ubicacion: { connect: { id: Number(ubicacionId) } } } : {}),
                    },
                },
            },
            include: {
                estado: { select: { id: true, code: true, label: true, orden: true } },
                ubicacion: { select: { id: true, code: true, nombre: true, orden: true } },
                resguardos: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });

        return res.status(201).json(created);
    } catch (e: any) {
        if (e?.code === 'P2002' && String(e?.meta?.target || '').includes('no_inventario')) {
            return res.status(409).json({
                error: `Ya existe un bien con el No. inventario: ${req.body.no_inventario}`,
                field: 'no_inventario',
            });
        }
        console.error('[inventario.create] error', e);
        return res.status(400).json({ error: 'No se pudo crear el bien.' });
    }
}

/** PUT /api/inventario/:id  (RBAC según estadoLogico) */
export async function update(req: Request, res: Response) {
    const id = Number(req.params.id);

    const {
        no_inventario,
        nombre,
        responsable,
        clasificacionId,
        rfc,
        personalId,
        no_factura,
        fecha_adjudicacion,
        modelo,
        categoria,
        marca,
        no_serie,
        observaciones,
        fecha_entrega,

        costo_adquisicion,
        tipoPropiedad,
        proveedorId,

        estadoId,
        ubicacionId,
        tipo,
        fotoUrl,
        foto,
    } = req.body || {};

    const { userId, role } = auth(req);

    const pSnap = personalId !== undefined ? await resolvePersonalSnapshot(personalId) : null;

// si mandaron personalId pero no existe/inactivo:
    if (personalId && !pSnap) {
        return res.status(400).json({ error: 'personalId inválido o inactivo' });
    }

    const responsableFinal =
        personalId !== undefined
            ? (pSnap ? pSnap.nombre : '') // (si es null -> lo limpias)
            : (responsable !== undefined ? String(responsable).trim() : undefined);

    const rfcFinal =
        personalId !== undefined
            ? (pSnap ? pSnap.rfc : '')
            : (rfc !== undefined ? String(rfc).trim() : undefined);

    const responsablePuestoFinal = pSnap ? pSnap.puesto : null;


    try {
        const before = await prisma.inventoryItem.findUnique({
            where: { id },
            include: { ubicacion: true, estado: true },
        });

        if (!before) return res.status(404).json({ error: 'No encontrado' });

        const isCreator = userId && before.createdById && Number(before.createdById) === Number(userId);

        // ✅ RBAC por estado
        if (before.estadoLogico === EstadoBienLogico.BORRADOR) {
            const touchedResp = (personalId !== undefined) || (responsable !== undefined) || (rfc !== undefined);

            if (touchedResp) {
                const rb = await prisma.resguardoBien.findFirst({
                    where: { bienId: id, estado: EstadoResguardo.BORRADOR },
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                });

                if (rb) {
                    await prisma.resguardoBien.update({
                        where: { id: rb.id },
                        data: {
                            ...(personalId !== undefined
                                ? (pSnap
                                    ? { personal: { connect: { id: pSnap.personalId } } }
                                    : { personal: { disconnect: true } })
                                : {}),
                            ...(responsableFinal !== undefined ? { responsable: String(responsableFinal) } : {}),
                            ...(rfcFinal !== undefined ? { rfc: String(rfcFinal) } : {}),
                            ...(personalId !== undefined ? { responsablePuesto: responsablePuestoFinal } : {}),
                        },
                    });
                }
            }
        } else if (before.estadoLogico === EstadoBienLogico.ACTIVO) {
            if (!(role === Role.ADMIN || role === Role.CONTROL_PATRIMONIAL)) {
                return res.status(403).json({ error: 'Solo ADMIN o CONTROL_PATRIMONIAL puede editar ACTIVO.' });
            }

            // ✅ Bloquea cambio de responsable directo en ACTIVO
            if (personalId !== undefined || responsable !== undefined || rfc !== undefined) {
                return res.status(400).json({
                    error: 'En ACTIVO no se cambia responsable por edición. Usa Cancelar resguardo y crear nuevo BORRADOR.'
                });
            }
        } else if (before.estadoLogico === EstadoBienLogico.BAJA) {
            return res.status(400).json({ error: 'Un bien en BAJA no es editable.' });
        }

        const updated = await prisma.inventoryItem.update({
            where: { id },
            data: {
                ...(no_inventario !== undefined ? { no_inventario: String(no_inventario) } : {}),
                ...(nombre !== undefined ? { nombre: String(nombre) } : {}),
                ...(personalId !== undefined
                    ? (personalId
                        ? { personal: { connect: { id: Number(personalId) } } }
                        : { personal: { disconnect: true } })
                    : {}),

                ...(responsableFinal !== undefined ? { responsable: String(responsableFinal) } : {}),
                ...(rfcFinal !== undefined ? { rfc: String(rfcFinal) } : {}),
                ...(clasificacionId !== undefined
                    ? (clasificacionId
                            ? { clasificacion: { connect: { id: Number(clasificacionId) } } }
                            : { clasificacion: { disconnect: true } }
                    )
                    : {}),
                ...(no_factura !== undefined ? { no_factura: no_factura ? String(no_factura) : null } : {}),
                ...(fecha_adjudicacion !== undefined ? { fecha_adjudicacion: asDate(fecha_adjudicacion) } : {}),
                ...(modelo !== undefined ? { modelo: modelo || null } : {}),
                ...(marca !== undefined ? { marca: marca || null } : {}),
                ...(no_serie !== undefined ? { no_serie: no_serie || null } : {}),
                ...(observaciones !== undefined ? { observaciones: observaciones || null } : {}),
                ...(fecha_entrega !== undefined ? { fecha_entrega: asDate(fecha_entrega) } : {}),
                ...(tipo !== undefined ? { tipo: String(tipo).toUpperCase() as TipoBien } : {}),

                ...(fotoUrl !== undefined || foto !== undefined
                    ? { fotoUrl: (fotoUrl ?? foto) ? String(fotoUrl ?? foto).trim() : null }
                    : {}),

                ...(categoria !== undefined ? { categoria: String(categoria).toUpperCase() as CategoriaBien } : {}),

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

                ...(costo_adquisicion !== undefined ? { costo_adquisicion: Number(costo_adquisicion) } : {}),
                ...(tipoPropiedad !== undefined ? { tipoPropiedad: String(tipoPropiedad).toUpperCase() as any } : {}),

                ...(proveedorId !== undefined
                    ? proveedorId
                        ? { proveedor: { connect: { id: Number(proveedorId) } } }
                        : { proveedor: { disconnect: true } }
                    : {}),
            },
            include: { estado: true, ubicacion: true },
        });

        // ✅ movimientos automáticos
        if (userId) {
            const bienId = updated.id;

            if (before.responsable !== updated.responsable) {
                await MovimientosService.registrarMovimiento({
                    bienId,
                    usuarioId: userId,
                    tipo: TipoMovimiento.CAMBIO_RESPONSABLE,
                    motivo: 'Cambio de responsable',
                    responsableAntes: before.responsable || '',
                    responsableDespues: updated.responsable || '',
                    ubicacionAntes: '',
                    ubicacionDespues: '',
                });
            }

            if (before.ubicacionId !== updated.ubicacionId) {
                const ubicacionAntes = before.ubicacion?.nombre || '';
                const ubicacionDespues = updated.ubicacion?.nombre || '';

                await MovimientosService.registrarMovimiento({
                    bienId,
                    usuarioId: userId,
                    tipo: TipoMovimiento.CAMBIO_UBICACION,
                    motivo: 'Cambio de ubicación',
                    responsableAntes: '',
                    responsableDespues: '',
                    ubicacionAntes,
                    ubicacionDespues,
                });
            }

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
                    tipo: TipoMovimiento.OTRO,
                    motivo: 'Actualización de información del bien',
                    responsableAntes: '',
                    responsableDespues: '',
                    ubicacionAntes: '',
                    ubicacionDespues: '',
                });
            }
        }

        return res.json(updated);
    } catch (e: any) {
        console.error('[inventario.update] error', e);
        return res.status(400).json({ error: 'No se pudo actualizar', detail: e?.message || String(e) });
    }
}

/** POST /api/inventario/:id/factura  (sube factura y la guarda en ArchivoBien) */
export async function subirFactura(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { userId, role } = auth(req);

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'No encontrado' });

    const isCreator = userId && item.createdById && Number(item.createdById) === Number(userId);

    if (item.estadoLogico === EstadoBienLogico.BORRADOR) {
        if (!(role === Role.ADMIN || role === Role.CONTROL_PATRIMONIAL || role === Role.AUXILIAR_PATRIMONIAL || isCreator)) return res.status(403).json({ error: 'No autorizado' });
    } else if (item.estadoLogico === EstadoBienLogico.ACTIVO) {
        if (!(role === Role.ADMIN || role === Role.CONTROL_PATRIMONIAL)) return res.status(403).json({ error: 'No autorizado' });
    } else {
        return res.status(400).json({ error: 'No se puede subir factura en este estado.' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'Archivo requerido' });
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const filePath = `/api/uploads/bien/${file.filename}`;

    await prisma.archivoBien.create({
        data: {
            tipo: TipoArchivoBien.FACTURA,
            nombre: file.originalname,
            filePath,
            bien: { connect: { id } },
            uploadedBy: { connect: { id: Number(userId) } },
        },
    });

    res.json({ ok: true, filePath });
}

/** POST /api/inventario/:id/resguardo/firmado  (sube escaneado firmado al resguardo actual) */
export async function subirResguardoFirmado(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { userId, role } = auth(req);

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'No encontrado' });

    const isCreator = userId && item.createdById && Number(item.createdById) === Number(userId);

    // ✅ En BORRADOR: admin o creador. En ACTIVO: admin o control
    if (item.estadoLogico === 'BORRADOR') {
        if (!(role === 'ADMIN' || role === Role.CONTROL_PATRIMONIAL || role === Role.AUXILIAR_PATRIMONIAL || isCreator)) return res.status(403).json({ error: 'No autorizado' });
    } else if (item.estadoLogico === 'ACTIVO') {
        if (!(role === 'ADMIN' || role === 'CONTROL_PATRIMONIAL')) return res.status(403).json({ error: 'No autorizado' });
    } else {
        return res.status(400).json({ error: 'No permitido en este estado.' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'Archivo requerido' });
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    // 👉 resguardo “actual”: si hay ACTIVO lo toma, si no, el BORRADOR más reciente
    const r = await prisma.resguardoBien.findFirst({
        where: { bienId: id, estado: EstadoResguardo.BORRADOR },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { archivos: { orderBy: { uploadedAt: 'desc' } } },
    });
    if (!r) return res.status(400).json({ error: 'No hay resguardo BORRADOR para firmar.' });

    const filePath = `/api/uploads/resguardo/${file.filename}`;

    // ✅ Guardamos archivo y (si aplica) activamos el resguardo en una transacción
    await prisma.$transaction(async (tx) => {
        await tx.resguardoArchivo.create({
            data: {
                resguardoId: r.id,
                tipo: TipoArchivoResguardo.RESGUARDO_FIRMADO,
                nombre: file.originalname,
                filePath,
                uploadedById: Number(userId),
            },
        });

        // Si el BIEN es ACTIVO, el resguardo firmado (BORRADOR) debe pasar a ACTIVO
        if (item.estadoLogico === EstadoBienLogico.ACTIVO) {
            await tx.resguardoBien.update({
                where: { id: r.id },
                data: { estado: EstadoResguardo.ACTIVO },
            });
        }
    });

    res.json({
        ok: true,
        filePath,
        note:
            item.estadoLogico === 'ACTIVO'
                ? 'Resguardo firmado y activado (bien ACTIVO).'
                : 'Resguardo firmado (bien BORRADOR).',
    });
}

/** POST /api/inventario/:id/resguardo/cancelado  (sube escaneado CANCELADO al resguardo ACTIVO) */
export async function subirResguardoCancelado(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { userId, role } = auth(req);

    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    if (!(role === Role.ADMIN || role === Role.CONTROL_PATRIMONIAL || role === Role.AUXILIAR_PATRIMONIAL)) {
        return res.status(403).json({ error: 'Solo ADMIN o CONTROL_PATRIMONIAL puede subir cancelación.' });
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    if (item.estadoLogico !== EstadoBienLogico.ACTIVO) return res.status(400).json({ error: 'Solo aplica a bienes ACTIVO.' });

    const activo = await prisma.resguardoBien.findFirst({
        where: { bienId: id, estado: EstadoResguardo.ACTIVO },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    if (!activo) return res.status(400).json({ error: 'No hay resguardo ACTIVO.' });

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'Archivo requerido' });

    const filePath = `/api/uploads/resguardo/${file.filename}`;

    await prisma.resguardoArchivo.create({
        data: {
            tipo: TipoArchivoResguardo.RESGUARDO_CANCELADO,
            nombre: file.originalname,
            filePath,
            resguardo: { connect: { id: activo.id } },
            uploadedBy: { connect: { id: Number(userId) } },
        },
    });

    res.json({ ok: true, filePath });
}

/** POST /api/inventario/:id/subir  (BORRADOR -> ACTIVO SOLO si hay FACTURA + RESGUARDO_FIRMADO) */
export async function subirAlInventario(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { userId, role } = auth(req);

    const item = await prisma.inventoryItem.findUnique({
        where: { id },
        include: { archivos: true },
    });
    if (!item) return res.status(404).json({ error: 'No encontrado' });

    if (item.estadoLogico !== EstadoBienLogico.BORRADOR) {
        return res.status(400).json({ error: 'Solo se puede subir al inventario desde BORRADOR.' });
    }

    const isCreator = userId && item.createdById && Number(item.createdById) === Number(userId);
    if (!(role === Role.ADMIN || isCreator)) {
        return res.status(403).json({ error: 'Solo ADMIN o el creador puede subir al inventario.' });
    }

    const tieneFactura = item.archivos.some(a => a.tipo === TipoArchivoBien.FACTURA);
    if (!tieneFactura) {
        return res.status(400).json({ error: 'Debes cargar la FACTURA antes de subir al inventario.' });
    }

    const r = await prisma.resguardoBien.findFirst({
        where: { bienId: id, estado: EstadoResguardo.BORRADOR },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { archivos: true },
    });
    if (!r) return res.status(400).json({ error: 'No hay resguardo BORRADOR.' });

    const tieneFirmado = (r.archivos || []).some(a => a.tipo === TipoArchivoResguardo.RESGUARDO_FIRMADO);
    if (!tieneFirmado) {
        return res.status(400).json({ error: 'Debes cargar el RESGUARDO_FIRMADO antes de subir al inventario.' });
    }

    await prisma.$transaction([
        prisma.inventoryItem.update({
            where: { id },
            data: { estadoLogico: EstadoBienLogico.ACTIVO },
        }),
        prisma.resguardoBien.update({
            where: { id: r.id },
            data: { estado: EstadoResguardo.ACTIVO },
        }),
    ]);

    if (userId) {
        await MovimientosService.registrarMovimiento({
            bienId: id,
            usuarioId: userId,
            tipo: TipoMovimiento.OTRO,
            motivo: 'Bien subido al inventario (FACTURA + RESGUARDO_FIRMADO)',
            responsableAntes: '',
            responsableDespues: '',
            ubicacionAntes: '',
            ubicacionDespues: '',
        });
    }

    res.json({ ok: true });
}

/**
 * POST /api/inventario/:id/resguardo/cancelar
 * Cancela el resguardo ACTIVO (requiere RESGUARDO_CANCELADO subido)
 * y crea nuevo resguardo BORRADOR con el nuevo responsable.
 */
export async function cancelarResguardo(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { userId, role } = auth(req);

    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    if (!(role === Role.ADMIN || role === Role.CONTROL_PATRIMONIAL)) {
        return res.status(403).json({ error: 'Solo ADMIN o CONTROL_PATRIMONIAL puede cancelar resguardos.' });
    }

    const item = await prisma.inventoryItem.findUnique({
        where: { id },
        include: { ubicacion: true },
    });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    if (item.estadoLogico !== EstadoBienLogico.ACTIVO) return res.status(400).json({ error: 'Solo aplica a bienes ACTIVO.' });

    const { responsableNuevo, rfcNuevo, puestoNuevo, personalId, ubicacionIdNuevo } = req.body || {};

    const pSnap = await resolvePersonalSnapshot(personalId);

    // ✅ En tu UI el cambio es por catálogo, así que exígelo
    if (!personalId) {
        return res.status(400).json({ error: 'personalId requerido (selecciona personal del catálogo).' });
    }

    if (personalId && !pSnap) {
        return res.status(400).json({ error: 'personalId inválido o inactivo' });
    }

    const responsableNuevoFinal = pSnap ? pSnap.nombre : String(responsableNuevo || '').trim();
    const rfcNuevoFinal = pSnap ? pSnap.rfc : String(rfcNuevo || '').trim();
    const puestoNuevoFinal = pSnap ? pSnap.puesto : (puestoNuevo ? String(puestoNuevo).trim() : null);

// ✅ si NO mandaron personalId, exige responsable/rfc manual
    if (!pSnap) {
        if (!responsableNuevoFinal) return res.status(400).json({ error: 'responsableNuevo requerido' });
        if (!rfcNuevoFinal) return res.status(400).json({ error: 'rfcNuevo requerido' });
    }


    const activo = await prisma.resguardoBien.findFirst({
        where: { bienId: id, estado: EstadoResguardo.ACTIVO },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { archivos: true, ubicacion: true },
    });
    if (!activo) return res.status(400).json({ error: 'No hay resguardo ACTIVO.' });

    const tieneCancelado = (activo.archivos || []).some(a => a.tipo === TipoArchivoResguardo.RESGUARDO_CANCELADO);
    if (!tieneCancelado) {
        return res.status(400).json({ error: 'Primero sube el escaneado RESGUARDO_CANCELADO para poder cancelar.' });
    }

    const responsableAntes = item.responsable;
    const ubicAntes = item.ubicacion?.nombre || '';

    const ubicNuevaId = ubicacionIdNuevo ? Number(ubicacionIdNuevo) : null;

    await prisma.$transaction(async (tx) => {
        // 1) cancelar resguardo ACTIVO
        await tx.resguardoBien.update({
            where: { id: activo.id },
            data: {
                estado: EstadoResguardo.CANCELADO,
                canceladoAt: new Date(),
                canceladoPor: { connect: { id: Number(userId) } },
            },
        });

        // 2) actualizar item
        await tx.inventoryItem.update({
            where: { id },
            data: {
                responsable: String(responsableNuevoFinal),
                rfc: String(rfcNuevoFinal),
                ...(ubicNuevaId ? { ubicacion: { connect: { id: ubicNuevaId } } } : {}),

                ...(pSnap
                    ? { personal: { connect: { id: pSnap.personalId } } }     // si viene del catálogo
                    : { personal: { disconnect: true } }
                ),// si fue manual, quita el anterior
            },
        });

        // 3) crear nuevo resguardo BORRADOR (SOLO connect)
        await tx.resguardoBien.create({
            data: {
                bien: { connect: { id } },
                estado: EstadoResguardo.BORRADOR,
                responsable: String(responsableNuevoFinal),
                rfc: String(rfcNuevoFinal),
                responsablePuesto: puestoNuevoFinal,
                ...(pSnap ? { personal: { connect: { id: pSnap.personalId } } } : {}),
                creadoPor: { connect: { id: Number(userId) } },
                ...(ubicNuevaId ? { ubicacion: { connect: { id: ubicNuevaId } } } : {}),
            },
        });
    });

    // movimientos
    if (responsableAntes !== String(responsableNuevoFinal)) {
        await MovimientosService.registrarMovimiento({
            bienId: id,
            usuarioId: userId,
            tipo: TipoMovimiento.CAMBIO_RESPONSABLE,
            motivo: 'Cambio de responsable (nuevo resguardo)',
            responsableAntes,
            responsableDespues: String(responsableNuevoFinal),
            ubicacionAntes: '',
            ubicacionDespues: '',
        });
    }

    const itemAfter = await prisma.inventoryItem.findUnique({ where: { id }, include: { ubicacion: true } });
    const ubicDesp = itemAfter?.ubicacion?.nombre || '';

    if (ubicAntes !== ubicDesp) {
        await MovimientosService.registrarMovimiento({
            bienId: id,
            usuarioId: userId,
            tipo: TipoMovimiento.CAMBIO_UBICACION,
            motivo: 'Cambio de ubicación (nuevo resguardo)',
            responsableAntes: '',
            responsableDespues: '',
            ubicacionAntes: ubicAntes,
            ubicacionDespues: ubicDesp,
        });
    }

    res.json({ ok: true });
}

/** DELETE /api/inventario/:id  (solo ADMIN y solo BORRADOR) */
export async function remove(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { role } = auth(req);

    const allowed = new Set<Role>([
        Role.ADMIN,
        Role.CONTROL_PATRIMONIAL,
        Role.AUXILIAR_PATRIMONIAL,
    ]);

    if (!allowed.has(role)) {
        return res.status(403).json({ error: 'Solo ADMIN o Control Patrimonial pueden eliminar.' });
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'No encontrado' });

    if (item.estadoLogico !== EstadoBienLogico.BORRADOR) {
        return res.status(400).json({ error: 'Solo se puede eliminar un bien en BORRADOR.' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1) resguardo archivos -> resguardos
            await tx.resguardoArchivo.deleteMany({ where: { resguardo: { bienId: id } } });
            await tx.resguardoBien.deleteMany({ where: { bienId: id } });

            // 2) archivos / dictamenes / movimientos del bien (si existen)
            await tx.archivoBien.deleteMany({ where: { bienId: id } });
            await tx.dictamenBien.deleteMany({ where: { bienId: id } });
            await tx.movimientoBien.deleteMany({ where: { bienId: id } });

            // 3) por último el bien
            await tx.inventoryItem.delete({ where: { id } });
        });

        return res.json({ ok: true });
    } catch (e: any) {
        console.error('[inventario.remove] error', e);
        return res.status(400).json({
            error: 'No se pudo eliminar',
            detail: e?.message || String(e),
        });
    }
}
