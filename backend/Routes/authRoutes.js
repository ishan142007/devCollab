import e from "express";
import verifyToken from "../middleware/auth.middleware.js";
import { completeGithubOAuth, login, logout, me, signup, startGithubOAuth, updateMe } from "../controller/auth.controller.js";
const router=e.Router();

router.get("/auth/github",startGithubOAuth);
router.get("/auth/github/callback",completeGithubOAuth);
router.post("/auth/signup",signup);
router.post("/auth/login",login);
router.post("/auth/logout",logout);
router.get("/auth/me",verifyToken,me)
router.patch("/auth/me",verifyToken,updateMe)

export default router;