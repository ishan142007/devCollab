import mongoose from "mongoose";
import project from "../model/Project.model.js";
import DiscoveredRepository from "../model/DiscoveredRepository.model.js";
import { normalizeTechnologyTags } from "../utils/profile.js";


const createProject=async(req,res)=>{
  try {
    const owner=req.user.id;
    const body = req.body ?? {};
    const allowedFields = new Set(["title","description","status","technologies","featured","visibility"]);
    if(Object.keys(body).some((field) => !allowedFields.has(field))) {
      return res.status(400).json({message:"one or more project fields cannot be changed"});
    }
    const {title,description,status,technologies,featured,visibility}=body;
    
    if(typeof title !== "string" || !title.trim() || title.trim().length > 120) {
      return res.status(400).json({message:"project title must contain 1 to 120 characters"});
    }
    if(description !== undefined && (typeof description !== "string" || description.trim().length > 2000)) {
      return res.status(400).json({message:"project description must be at most 2000 characters"});
    }
    const normalizedTechnologies = technologies === undefined ? undefined : normalizeTechnologyTags(technologies);
    if(technologies !== undefined && !normalizedTechnologies) {
      return res.status(400).json({message:"technologies must be a list of up to 20 tags, each 1 to 40 characters"});
    }
    if(featured !== undefined && typeof featured !== "boolean") {
      return res.status(400).json({message:"featured must be true or false"});
    }
    if(visibility !== undefined && !["public", "private"].includes(visibility)) {
      return res.status(400).json({message:"visibility must be public or private"});
    }
    const newproject=await project.create({
        title:title.trim(),
        description:description?.trim() ?? "",
        status,
        owner:owner,
        technologies: normalizedTechnologies,
        featured: featured ?? false,
        visibility: visibility ?? "private"
    })
    return res.status(201).json({message:"new project created",project:newproject});
  } catch (error) {
    return res.status(500).json({message:"some error occured while creating project",error:error.message});
  }

}
const getProjects=async(req,res)=>{
    try {
        const{id:owner}=req.user;
        const allProjects=await project.find({owner})
          .select("title description status technologies featured visibility githubRepository githubSync createdAt")
          .sort({createdAt:1})
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
    if(!req.body || Object.keys(req.body).length===0)return res.status(400).json({message:"please send valid changes"});
    const allowedFields = new Set(["title","description","status","technologies","featured","visibility"]);
    if(Object.keys(req.body).some((field) => !allowedFields.has(field))) {
      return res.status(400).json({message:"one or more project fields cannot be changed"});
    }
    const {id:owner}=req.user;
    const projectId=req.params.id;
    if(!mongoose.Types.ObjectId.isValid(projectId))return res.status(400).json({message:"project id is not recieved"});
    const update={};
    const {title,description,status,technologies,featured,visibility}=req.body;

    if(title!==undefined) {
      if(typeof title!=="string" || !title.trim() || title.trim().length > 120)return res.status(400).json({message:"project title must contain 1 to 120 characters"});
      update.title=title.trim();
    }
    if(description!==undefined) {
      if(typeof description!=="string" || description.trim().length > 2000)return res.status(400).json({message:"project description must be at most 2000 characters"});
      update.description=description.trim();
    }
    if(status!==undefined)update.status=status;
    if(technologies!==undefined) {
      const normalizedTechnologies=normalizeTechnologyTags(technologies);
      if(!normalizedTechnologies) {
        return res.status(400).json({message:"technologies must be a list of up to 20 tags, each 1 to 40 characters"});
      }
      update.technologies=normalizedTechnologies;
    }
    if(featured!==undefined) {
      if(typeof featured!=="boolean")return res.status(400).json({message:"featured must be true or false"});
      update.featured=featured;
    }
    if(visibility!==undefined) {
      if(!["public","private"].includes(visibility))return res.status(400).json({message:"visibility must be public or private"});
      update.visibility=visibility;
    }
    if(Object.keys(update).length===0)return res.status(400).json({message:"please send valid changes"});

    const updatedProject=await project.findOneAndUpdate({owner,_id:projectId},update,{
      returnDocument:"after",
      runValidators:true
    });
    if(!updatedProject)return res.status(404).json({message:"project not found"});
    return res.status(200).json({message:"changes applied",updatedProject});
  } catch (error) {
    if(error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
      return res.status(400).json({message:"invalid project changes",error:error.message});
    }
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
    await DiscoveredRepository.updateMany(
      {user:owner,linkedProject:delProject._id},
      {$unset:{linkedProject:""}}
    );
    return res.status(200).json({message:"project removed",delProject});
  } 
  catch (error) {
    return res.status(500).json({message:"internal server error"});
  }
}
export {createProject,getProjects,getProjectById,updateProjectById,deleteProject};