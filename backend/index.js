import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import connectDB from "./Config/db.config.js";
import router from "./Routes/authRoutes.js";
import projrouter from "./Routes/project.Routes.js";
import taskrouter from "./Routes/task.Route.js";
import cookieParser from "cookie-parser";
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), ".env") });
const app=express();
 await connectDB();
 app.use(express.json());
 app.use(cookieParser())
 app.use(cors({
    origin: (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, ""),
    credentials:true
 }));
app.use("/api",router);
app.use("/api",projrouter);
app.use("/api",taskrouter);
app.listen("3000",()=>{
    console.log("running ");
})
