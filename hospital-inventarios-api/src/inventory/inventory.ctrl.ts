// hospital-inventarios-api/src/inventory/inventory.ctrl.ts
import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { TipoBien } from '@prisma/client';

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
    marca,
    no_serie,
    observaciones,
    fecha_entrega,
    estadoId,      // number
    ubicacionId,   // number
    tipo,          // 'ADMINISTRATIVO' | 'MEDICO'
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

        // enum
        tipo: (String(tipo || 'ADMINISTRATIVO').toUpperCase() as TipoBien),

        // relaciones (usar nested connect para evitar error de Prisma)
        ...(estadoId ? { estado: { connect: { id: Number(estadoId) } } } : {}),
        ...(ubicacionId ? { ubicacion: { connect: { id: Number(ubicacionId) } } } : {}),

        // quién creó (si manejas usuarios)
        ...(req as any).user?.id ? { createdById: Number((req as any).user.id) } : {},
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
    marca,
    no_serie,
    observaciones,
    fecha_entrega,
    estadoId,
    ubicacionId,
    tipo,
  } = req.body || {};

  try {
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
      },
      include: {
        estado: { select: { id: true, code: true, label: true, orden: true } },
        ubicacion: { select: { id: true, code: true, nombre: true, orden: true } },
      },
    });

    res.json(updated);
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
