import mongoose from "mongoose";
import project from "./Project.model";
 const taskSchema=mongoose.Schema({
    name:String,
    description:String,
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"project"
    },
    status:{
        type:String,
        enum:["Active","Pending","Completed"],
        default:"Active"
    }
 })
 const task=mongoose.model("task",taskSchema);
 export default task;