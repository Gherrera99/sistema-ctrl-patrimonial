// src/proveedores/proveedores.routes.ts
import { Router } from "express";
import * as ctrl from "./proveedores.ctrl.js";
import { authGuard, requirePermission } from "../auth/auth.middleware.js";

const r = Router();

// Lectura
r.get("/", authGuard, requirePermission("proveedores:read"), ctrl.list);
r.get("/:id", authGuard, requirePermission("proveedores:read"), ctrl.getOne);

// Escritura
r.post("/", authGuard, requirePermission("proveedores:write"), ctrl.create);
r.put("/:id", authGuard, requirePermission("proveedores:write"), ctrl.update);
r.delete("/:id", authGuard, requirePermission("proveedores:write"), ctrl.remove);

export default r;
