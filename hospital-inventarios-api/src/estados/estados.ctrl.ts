import { prisma } from '../prisma.js';
export const list = async (_req:any,res:any)=>{ const data = await prisma.estadoFisico.findMany({ orderBy:{ orden:'asc' } }); res.json(data); };
export const create = async (req:any,res:any)=>{ const { code, label, orden } = req.body; const e = await prisma.estadoFisico.create({ data:{ code, label, orden: orden ?? 99 } }); res.json(e); };
export const update = async (req:any,res:any)=>{ const id = Number(req.params.id); const { code, label, orden } = req.body; const e = await prisma.estadoFisico.update({ where:{ id }, data:{ code, label, orden } }); res.json(e); };
export const remove = async (req:any,res:any)=>{ const id = Number(req.params.id); await prisma.estadoFisico.delete({ where:{ id } }); res.json({ ok:true }); };
