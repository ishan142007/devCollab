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
        const allProjects=await project.find({owner:owner}).select("title status createdAt").sort({createdAt:-1})
        return res.status(200).json({message:"projects retrieved successfully",allProjects});
    } catch (error) {
        return res.status(500).json({message:"internal server error ",error:error.message});
    }

}
export {createProject,getProjects};