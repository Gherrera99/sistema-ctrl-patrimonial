import { prisma } from '../prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(4) });
const tokenPair = (user:any)=>{
  const payload = { id:user.id, role:user.role, name:user.name, email:user.email };
  const access = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn:'2h' });
  const refresh = jwt.sign({ id:user.id }, process.env.JWT_SECRET!, { expiresIn:'7d' });
  return { access, refresh };
};
export const login = async (req,res)=>{
  const parsed = loginSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'Datos inválidos'});
  const u = await prisma.user.findUnique({ where:{ email: parsed.data.email }});
  if(!u) return res.status(401).json({error:'Credenciales inválidas'});
  const ok = await bcrypt.compare(parsed.data.password, u.password);
  if(!ok) return res.status(401).json({error:'Credenciales inválidas'});
  const t = tokenPair(u);
  res.cookie('access', t.access, { httpOnly:true, sameSite:'lax' });
  res.cookie('refresh', t.refresh, { httpOnly:true, sameSite:'lax' });
  res.json({ user: { id:u.id, name:u.name, email:u.email, role:u.role } });
};
export const me = async (req:any,res:any)=>{ res.json(req.user); };
export const logout = async (req,res)=>{ res.clearCookie('access'); res.clearCookie('refresh'); res.json({ok:true}); };
export const createUser = async (req,res)=>{
  const {name,email,password,role='colaborador'} = req.body;
  const hash = await bcrypt.hash(password || 'cambio123', 10);
  const user = await prisma.user.create({ data: { name,email,password:hash,role } });
  res.json(user);
};
export const listUsers = async (req,res)=>{
  const users = await prisma.user.findMany({ select:{id:true,name:true,email:true,role:true,createdAt:true} });
  res.json(users);
};
export const updateUser = async (req,res)=>{
  const id = Number(req.params.id);
  const {name,role} = req.body;
  const user = await prisma.user.update({ where:{id}, data:{name,role} });
  res.json(user);
};
export const deleteUser = async (req,res)=>{
  const id = Number(req.params.id);
  await prisma.user.delete({ where:{id} });
  res.json({ok:true});
};
