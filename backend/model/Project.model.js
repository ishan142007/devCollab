import mongoose from "mongoose";
import User from "./User.model.js";

const projectSchema=mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    status:{
        type:String,
        enum:["Active","Completed","Archieved"],
        default:"Active"
    }
   
    
},{
    timestamps:true
}
)
const project=mongoose.model("Project",projectSchema)
export default project;