import e from "express";
import verifyToken from "../middleware/auth.middleware.js";
import { login, me, signup, updateMe } from "../controller/auth.controller.js";
const router=e.Router();

router.post("/auth/signup",signup);
router.post("/auth/login",login);
router.get("/auth/me",verifyToken,me)
router.patch("/auth/me",verifyToken,updateMe)

export default router;