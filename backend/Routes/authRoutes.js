import e from "express";
import verifyToken from "../middleware/auth.middleware.js";
import { login, me, signup } from "../controller/auth.controller.js";
const router=e.Router();

router.post("/auth/signup",signup);
router.post("/auth/login",login);
router.get("/auth/me",verifyToken,me)

export default router;