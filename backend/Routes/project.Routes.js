import e from "express";
import { createProject } from "../controller/project.controller.js";
import verifyToken from "../middleware/auth.middleware.js";

const projrouter=e.Router();
projrouter.post("/project",verifyToken,createProject);

export default projrouter;
