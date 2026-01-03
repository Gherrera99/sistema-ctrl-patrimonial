//api/src/dictamen/dictamen.ctrl.ts

import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { buildDictamenPdf } from './dictamen.pdf.js';
import { TipoArchivoDictamen } from '@prisma/client';

function coordFromCategoria(item: any) {
    // GENERAL -> MANTENIMIENTO, INFORMATICA -> TECNOLOGIAS
    const cat = String(item.categoria ?? 'GENERAL').toUpperCase();
    return cat === 'INFORMATICA' ? 'TECNOLOGIAS' : 'MANTENIMIENTO';
}

function tipoDictamenFromCategoria(item: any) {
    const cat = String(item.categoria ?? 'GENERAL').toUpperCase();
    return cat === 'INFORMATICA' ? 'INFORMATICA' : 'ADMINISTRATIVO';
}

export async function searchBienes(req: Request, res: Response) {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);

    const items = await prisma.inventoryItem.findMany({
        where: {
            OR: [
                { no_inventario: { contains: q } },
                { nombre: { contains: q } },
                { no_serie: { contains: q } },
            ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            no_inventario: true,
            nombre: true,
            no_serie: true,
            marca: true,
            modelo: true,
            responsable: true,
            categoria: true,
            ubicacion: { select: { nombre: true } },
            estado: { select: { label: true } },
        },
    });

    res.json(items);
}

export async function createDictamen(req: Request, res: Response) {
    const userId = Number((req as any).user?.id);
    const { bienId, dictamenTexto, coordinacion, unidadAdscripcion, ubicacionFisica, fecha } = req.body || {};

    if (!bienId) return res.status(400).json({ error: 'bienId requerido' });
    if (!dictamenTexto || !String(dictamenTexto).trim()) return res.status(400).json({ error: 'dictamenTexto requerido' });

    const bien = await prisma.inventoryItem.findUnique({ where: { id: Number(bienId) }, include: { ubicacion: true, estado: true } });
    if (!bien) return res.status(404).json({ error: 'Bien no encontrado' });

    const tipo = tipoDictamenFromCategoria(bien);

    const coordTipo = (coordinacion
            ? String(coordinacion).toUpperCase()
            : coordFromCategoria(bien)
    ) as any;

    const cfg = await prisma.dictamenConfig.findUnique({
        where: { coordinacion: coordTipo },
    });
    if (!cfg) return res.status(400).json({ error: `No existe configuración para coordinacion ${coordTipo}` });

    const created = await prisma.dictamenBien.create({
        data: {
            bienId: bien.id,
            tipo: tipo as any,

            coordinacionTipo: coordTipo,   // ✅ correcto según schema
            configId: cfg.id,              // ✅ liga a config

            unidadAdscripcion: unidadAdscripcion || null,
            ubicacionFisica: ubicacionFisica || (bien.ubicacion?.nombre ?? null),
            fecha: fecha ? new Date(fecha) : new Date(),
            dictamenTexto: String(dictamenTexto),
            estado: 'BORRADOR' as any,
            creadoPorId: userId,
        },
        include: { bien: true },
    });


    // opcional: al crear, marcar el bien EN_DICTAMEN
    await prisma.inventoryItem.update({
        where: { id: bien.id },
        data: { estadoLogico: 'EN_DICTAMEN' as any },
    }).catch(() => {});

    res.status(201).json(created);
}

export async function getDictamen(req: Request, res: Response) {
    const id = Number(req.params.id);
    const d = await prisma.dictamenBien.findUnique({
        where: { id },
        include: {
            bien: { include: { ubicacion: true, estado: true, proveedor: true } },
            creadoPor: { select: { id: true, name: true, email: true, role: true } },
            DictamenArchivo: { orderBy: { uploadedAt: 'desc' } },

        },
    });
    if (!d) return res.status(404).json({ error: 'No encontrado' });
    res.json(d);
}

export async function updateDictamen(req: Request, res: Response) {
    const id = Number(req.params.id);
    const role = String((req as any).user?.role ?? '');
    const isAdmin = role === 'ADMIN';

    const before = await prisma.dictamenBien.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'No encontrado' });
    if (String(before.estado) !== 'BORRADOR' && !isAdmin) {
        return res.status(400).json({ error: 'Solo ADMIN puede editar dictámenes firmados/cancelados' });
    }

    const { dictamenTexto, unidadAdscripcion, ubicacionFisica, fecha } = req.body || {};

    const updated = await prisma.dictamenBien.update({
        where: { id },
        data: {
            ...(dictamenTexto !== undefined ? { dictamenTexto: String(dictamenTexto) } : {}),
            ...(unidadAdscripcion !== undefined ? { unidadAdscripcion: unidadAdscripcion || null } : {}),
            ...(ubicacionFisica !== undefined ? { ubicacionFisica: ubicacionFisica || null } : {}),
            ...(fecha !== undefined ? { fecha: fecha ? new Date(fecha) : new Date() } : {}),
        },
    });

    res.json(updated);
}

export async function listDictamenes(req: Request, res: Response) {
    const q = String(req.query.q ?? '').trim();
    const estado = String(req.query.estado ?? '').trim(); // BORRADOR | FIRMADO | CANCELADO
    const mine = String(req.query.mine ?? '') === '1';
    const take = Math.min(Number(req.query.take ?? 50), 200);

    const where: any = {};
    if (estado) where.estado = estado as any;
    if (mine) where.creadoPorId = Number((req as any).user?.id);

    if (q) {
        where.OR = [
            { folio: { contains: q } },
            { bien: { no_inventario: { contains: q } } },
            { bien: { nombre: { contains: q } } },
        ];
    }

    const rows = await prisma.dictamenBien.findMany({
        where,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
            bien: { select: { id: true, no_inventario: true, nombre: true, categoria: true } },
            creadoPor: { select: { id: true, name: true } },
            DictamenArchivo: { orderBy: { uploadedAt: 'desc' } },
        },
    });

    res.json(rows);
}

export async function firmarDictamen(req: Request, res: Response) {
    const id = Number(req.params.id);

    const dictamen = await prisma.dictamenBien.findUnique({
        where: { id },
        include: { bien: true, DictamenArchivo: true },
    });

    if (!dictamen) return res.status(404).json({ error: 'No encontrado' });
    if (String(dictamen.estado) !== 'BORRADOR') {
        return res.status(400).json({ error: 'Ya está firmado o cancelado' });
    }

    const tieneEscaneado = (dictamen.DictamenArchivo || []).some(a =>
        ['PDF', 'FOTO'].includes(String(a.tipo).toUpperCase())
    );

    if (!tieneEscaneado) {
        return res.status(400).json({ error: 'Primero sube el dictamen escaneado para poder firmar.' });
    }

    const coordTipo = String((dictamen as any).coordinacionTipo ?? '').toUpperCase();

    const cfg = dictamen.configId
        ? await prisma.dictamenConfig.findUnique({ where: { id: dictamen.configId } })
        : await prisma.dictamenConfig.findUnique({ where: { coordinacion: coordTipo as any } });

    if (!cfg) return res.status(400).json({ error: `No existe configuración para ${coordTipo}` });

    const updated = await prisma.dictamenBien.update({
        where: { id },
        data: {
            estado: 'FIRMADO' as any,
            firmadoPor: cfg.firmanteNombre,
            puestoFirmante: cfg.firmantePuesto,
            firmadoAt: new Date(),
        },
    });

    res.json(updated);
}

export async function cancelarDictamen(req: Request, res: Response) {
    const id = Number(req.params.id);
    const role = String((req as any).user?.role ?? '');
    if (role !== 'ADMIN') return res.status(403).json({ error: 'Solo ADMIN puede cancelar' });

    const d = await prisma.dictamenBien.findUnique({ where: { id } , include: { bien: true }});
    if (!d) return res.status(404).json({ error: 'No encontrado' });

    if (String(d.estado) === 'CANCELADO') return res.json(d);

    const updated = await prisma.dictamenBien.update({
        where: { id },
        data: { estado: 'CANCELADO' as any },
    });

    // opcional: regresar bien a ACTIVO si lo marcaste EN_DICTAMEN
    await prisma.inventoryItem.update({
        where: { id: d.bienId },
        data: { estadoLogico: 'ACTIVO' as any },
    }).catch(()=>{});

    res.json(updated);
}

export async function dictamenPdf(req: Request, res: Response) {
    const id = Number(req.params.id);

    const d = await prisma.dictamenBien.findUnique({
        where: { id },
        include: { bien: { include: { ubicacion: true, estado: true, proveedor: true } } },
    });
    if (!d) return res.status(404).send('No encontrado');

    const coordTipo = String((d as any).coordinacionTipo ?? '').toUpperCase();

    const cfg = d.configId
        ? await prisma.dictamenConfig.findUnique({ where: { id: d.configId } })
        : await prisma.dictamenConfig.findUnique({ where: { coordinacion: coordTipo as any } });

    res.setHeader('Content-Type', 'application/pdf');
    const doc = buildDictamenPdf(d as any, cfg as any);
    doc.pipe(res);
    doc.end();

}

export async function subirEscaneado(req: Request, res: Response) {
    const userId = Number((req as any).user?.id);

    const id = Number(req.params.id);
    const role = String((req as any).user?.role ?? '');
    const isAdmin = role === 'ADMIN';

    const d = await prisma.dictamenBien.findUnique({ where: { id } });
    if (!d) return res.status(404).json({ error: 'No encontrado' });

    if (String(d.estado) !== 'BORRADOR' && !isAdmin) {
        return res.status(400).json({ error: 'Solo ADMIN puede subir escaneado si no está en BORRADOR' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'Archivo requerido' });

    const tipoArchivo =
        file.mimetype === 'application/pdf'
            ? TipoArchivoDictamen.PDF
            : TipoArchivoDictamen.FOTO;

    const publicPath = `/api/uploads/dictamen/${file.filename}`;

    await prisma.dictamenArchivo.create({
        data: {
            dictamenId: id,
            tipo: tipoArchivo,
            nombre: file.originalname,
            filePath: publicPath,
            uploadedById: userId,
        },
    });

    res.json({ ok: true, filePath: publicPath });
}

