import e from "express";
import verifyToken from "../middleware/auth.middleware.js";
import { signup } from "../controller/auth.controller.js";
const router=e.Router();

router.post("/signup",signup);

export default router;