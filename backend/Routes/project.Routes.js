import e from "express";
import { createProject, getProjects } from "../controller/project.controller.js";
import verifyToken from "../middleware/auth.middleware.js";

const projrouter=e.Router();
projrouter.post("/project",verifyToken,createProject);
projrouter.get("/project",verifyToken,getProjects);


export default projrouter;
