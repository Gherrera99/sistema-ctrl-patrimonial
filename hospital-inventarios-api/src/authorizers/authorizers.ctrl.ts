// hospital-inventarios-api/src/authorizers/authorizers.ctrl.ts
import { prisma } from '../prisma.js';
import { Request, Response } from 'express';
import { TipoBien } from '@prisma/client';

// Asegura que existan los grupos ADMINISTRATIVO y MEDICO
export async function ensureGroups() {
  const needed: { code: TipoBien; name: string }[] = [
    { code: 'ADMINISTRATIVO', name: 'Administrativos' },
    { code: 'MEDICO', name: 'Médicos' },
  ];
  for (const g of needed) {
    await prisma.authorizerGroup.upsert({
      where: { code: g.code },
      create: { code: g.code, name: g.name },
      update: {},
    });
  }
}

export async function list(_req: Request, res: Response) {
  await ensureGroups();

  const groups = await prisma.authorizerGroup.findMany({
    orderBy: { id: 'asc' },
    include: {
      authorizers: { orderBy: [{ active: 'desc' }, { fullName: 'asc' }] },
    },
  });

  // Para el front: regresamos dos listas separadas por tipo
  const administrativos = groups.find(g => g.code === 'ADMINISTRATIVO')?.authorizers ?? [];
  const medicos = groups.find(g => g.code === 'MEDICO')?.authorizers ?? [];

  res.json({ administrativos, medicos });
}

export async function create(req: Request, res: Response) {
  const { fullName, title, entity, groupCode } = req.body as {
    fullName?: string;
    title?: string;
    entity?: string;
    groupCode?: TipoBien; // 'ADMINISTRATIVO' | 'MEDICO'
  };

  if (!fullName || !title || !entity || !groupCode) {
    return res.status(400).json({ error: 'fullName, title, entity y groupCode son obligatorios' });
  }

  await ensureGroups();

  const group = await prisma.authorizerGroup.findUnique({ where: { code: groupCode } });
  if (!group) return res.status(400).json({ error: 'Grupo inválido' });

  const created = await prisma.authorizer.create({
    data: {
      fullName,
      title,
      entity,
      groupId: group.id,
      active: false,
    },
  });

  res.json(created);
}

// Marca como activo un autorizador del grupo (no forzamos exclusividad, solo activamos ese registro)
export async function activate(req: Request, res: Response) {
  const id = Number(req.params.id);
  const a = await prisma.authorizer.findUnique({ where: { id } });
  if (!a) return res.status(404).json({ error: 'No encontrado' });

  const updated = await prisma.authorizer.update({
    where: { id },
    data: { active: true, validFrom: new Date(), validTo: null },
  });

  res.json(updated);
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.authorizer.delete({ where: { id } });
  res.json({ ok: true });
}
