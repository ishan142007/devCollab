import e from "express";
import { createProject, getProjectById, getProjects } from "../controller/project.controller.js";
import verifyToken from "../middleware/auth.middleware.js";

const projrouter=e.Router();
projrouter.post("/project",verifyToken,createProject);
projrouter.get("/project",verifyToken,getProjects);
projrouter.get("/project/:id",verifyToken,getProjectById);



export default projrouter;
