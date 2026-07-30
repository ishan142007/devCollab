import e from "express";
import verifyToken from "../middleware/auth.middleware.js";
import { login, signup } from "../controller/auth.controller.js";
const router=e.Router();

router.post("/signup",signup);
router.post("/login",login);

export default router;