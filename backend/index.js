import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./Config/db.config.js";
import router from "./Routes/authRoutes.js";
import projrouter from "./Routes/project.Routes.js";
dotenv.config();
const app=express();
 await connectDB();
 app.use(cors());
 app.use(express.json());
app.use("/api",router);
app.use("/api",projrouter);
app.listen("3000",()=>{
    console.log("running ");
})
