// src/proveedores/proveedores.routes.ts
import { Router } from "express";
import * as ctrl from "./proveedores.ctrl.js";
import { authGuard } from "../auth/auth.middleware.js";

const r = Router();

r.get("/", authGuard, ctrl.list);
r.post("/", authGuard, ctrl.create);
r.get("/:id", authGuard, ctrl.getOne);
r.put("/:id", authGuard, ctrl.update);
r.delete("/:id", authGuard, ctrl.remove);

export default r;
