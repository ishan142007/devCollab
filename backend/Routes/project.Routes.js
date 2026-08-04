import e from "express";
import { createProject, deleteProject, getProjectById, getProjects, updateProjectById } from "../controller/project.controller.js";
import verifyToken from "../middleware/auth.middleware.js";

const projrouter=e.Router();
projrouter.post("/project",verifyToken,createProject);
projrouter.get("/project",verifyToken,getProjects);
projrouter.get("/project/:id",verifyToken,getProjectById);
projrouter.patch("/project/:id",verifyToken,updateProjectById);
projrouter.delete("/project/:id",verifyToken,deleteProject);





export default projrouter;
