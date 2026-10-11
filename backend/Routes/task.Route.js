import e from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../controller/Task.controller.js";
import verifyToken from "../middleware/auth.middleware.js";

const taskrouter = e.Router();

taskrouter.post("/project/:projectId/task", verifyToken, createTask);
taskrouter.get("/project/:projectId/task", verifyToken, getTasks);
taskrouter.get("/project/:projectId/task/:taskId", verifyToken, getTaskById);
taskrouter.patch("/project/:projectId/task/:taskId", verifyToken, updateTask);
taskrouter.delete("/project/:projectId/task/:taskId", verifyToken, deleteTask);

export default taskrouter;
