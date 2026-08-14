import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./Config/db.config.js";
import router from "./Routes/authRoutes.js";
import projrouter from "./Routes/project.Routes.js";
import cookieParser from "cookie-parser";
dotenv.config();
const app=express();
 await connectDB();
 app.use(express.json());
 app.use(cookieParser())
 app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
 }));
app.use("/api",router);
app.use("/api",projrouter);
app.listen("3000",()=>{
    console.log("running ");
})
