import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./Config/db.config.js";
dotenv.config();
const app=express();
 await connectDB();
app.use(cors());

app.listen("3000",()=>{
    console.log("running ");
})
