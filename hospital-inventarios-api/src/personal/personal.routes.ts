import { Router } from "express";
import { authGuard } from "../auth/auth.middleware.js";
import { listPersonal, createPersonal, updatePersonal, disablePersonal } from "./personal.ctrl.js";

const router = Router();

router.get("/", authGuard, listPersonal);
router.post("/", authGuard, createPersonal);
router.put("/:id", authGuard, updatePersonal);
router.delete("/:id", authGuard, disablePersonal); // soft delete

export default router;
