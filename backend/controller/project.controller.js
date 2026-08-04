import mongoose from "mongoose";
import project from "../model/Project.model.js";


const createProject=async(req,res)=>{
  try {
    const owner=req.user.id;
  
    const {title,description}=req.body;
    
    if(!title?.trim())return res.status(400).json({message:"invalid data"});
    const newproject=await project.create({
        title,
        description,
        owner:owner,
    })
    return res.status(201).json({message:"new project created",project:newproject});
  } catch (error) {
    return res.status(500).json({message:"some error occured while creating project",error:error.message});
  }

}
const getProjects=async(req,res)=>{
    try {
        const{id:owner}=req.user;
        const allProjects=await project.find({owner}).select("title status createdAt").sort({createdAt:-1})
        return res.status(200).json({message:"projects retrieved successfully",allProjects});
    } catch (error) {
        return res.status(500).json({message:"internal server error ",error:error.message});
    }

}
const getProjectById=async(req,res)=>{
 try {
  const owner=req.user.id;
  const itemId=req.params.id;
  if(!mongoose.Types.ObjectId.isValid(itemId))return res.status(400).json({message:"project id is not recieved"});
  const item=await project.findOne({
    _id:itemId,
    owner
  });
  if(!item)return res.status(404).json({message:"not found "})
    return res.status(200).json({message:"project sent",item});
 } catch (error) {
  return res.status(500).json({message:"internal error occured ",error:error.message });
 }
}
const updateProjectById=async(req,res)=>{
  try {
    if(Object.keys(req.body).length===0)return res.status(400).json({message:"please send valid changes"});
    const {id:owner}=req.user;
    const projectId=req.params.id;
    if(!mongoose.Types.ObjectId.isValid(projectId))return res.status(400).json({message:"project id is not recieved"});
    const update={};
    const {title,description,status}=req.body;

    if(title!==undefined)update.title=title;
    if(description!==undefined)update.description=description;
    if(status!==undefined)update.status=status;

    const updateProject=await project.findOneAndUpdate({owner,_id:projectId},update,{
      returnDocument:"after"
    });
    return res.status(200).json({message:"changes applied",updateProject});
  } catch (error) {
    return res.status(500).json({message:"internal server error",error:error.message});
  }

}
const deleteProject=async(req,res)=>{
  try {
    
    const{id:owner}=req.user;
    const projectId=req.params.id;
    if(!mongoose.Types.ObjectId.isValid(projectId))return res.status(400).json({message:"project id is not recieved"});
    const delProject=await project.findOneAndDelete({owner,_id:projectId});
    if(!delProject)return res.status(404).json({message:"project not found "});
    return res.status(200).json({message:"project removed",delProject});
  } 
  catch (error) {
    return res.status(500).json({message:"internal server error"});
  }
}
export {createProject,getProjects,getProjectById,updateProjectById,deleteProject};