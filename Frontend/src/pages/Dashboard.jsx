import axios from "axios"
import { useEffect, useState } from "react"
import ProjectCard from "../components/ProjectCard"




function Dashboard() {

  const [showCreate , setShowCreate]  = useState(false); 
  const [editProject , setEditProject] = useState(null);
  const [editForm,setEditForm]=useState({
    title:"",
    description:"",
    status:""
  })
  const [formData , setFormData] = useState({
    title:"",
    description:"",
    status:"Active"
  })
  const [projects, setprojects] = useState([]);
  const [loading, setloading] = useState(true);
  const [error, seterror] = useState("");
  
  useEffect(()=>{
    const showprojects=async()=>{
      setloading(true);
      try {
        
        const response=await axios.get("http://localhost:3000/api/project",{withCredentials:true});
        const allProjects=response.data.allProjects;
        setprojects(allProjects);
        if(allProjects.length===0)
          seterror("no projects found");
      } catch (error) {
        seterror(error);
      }finally{
        setloading(false);
      }
    }
    showprojects();
  },[])
  
  
  const handleCreate=async(e)=>{
    try {
      e.preventDefault();
      setloading(true);
      // console.log(formData)
      const {title,description,status}=formData;
      
      const response=await axios.post(
        "http://localhost:3000/api/project",
        {
          title,
          description,
          status
        },
        {
          withCredentials:true
        }
      );
      const newProject=response.data.project;
      setprojects(projects=>[newProject,...projects]);
      setFormData({
        title:"",
        description:"",
        status:"Active"
      })
      setShowCreate(false);
      
    } catch (error) {
      seterror(error.message||"failed to create project");
    }
    finally{
      setloading(false);
    }
  }
  const handleEdit=async (e) => {
      e.preventDefault();
      try {
        setloading(true);
         let response=await axios.patch(`https://localhost:3000/api/project/:${editProject._id}`,{withCredentials:true},{
          title:editForm.title,
          description:editForm.description,
          status:editForm.status
        });
        const updatedProjects=response.data.updatedProject;
        setprojects(prevProjects=>prevProjects.map(projects=>projects._id===updatedProjects._id?updatedProjects:projects))
        setEditProject(null);
        setEditForm({
          title:"",
          description:"",
          status:""
        })
        
      } catch (error) {
        seterror(error?.message||"some error occured ");
      }
      finally{
        setloading(false);
      }
  
    }

  if(loading)return <>.........loading..........</>
  if(showCreate)return <>
    <div>
      <form action=""  onSubmit={handleCreate}>
      <pre>
        title: <input type="text" onChange={(e)=>{setFormData({...formData,title:e.target.value})}} className="cursor-pointer "/>
        <br/>
        description: <input type="text" onChange={(e)=>{setFormData({...formData,description:e.target.value})}} className="cursor-pointer"/>
        <br/>
        status: <select 
        value={formData.status}
        onChange={(e)=>{
          setFormData({...formData,status:e.target.value});
        }}
        className="cursor-pointer"
        >
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Archived">Archived</option>


        </select>
        <br/>
        <input type="submit" value="Create" className="cursor-pointer"/><br/>
        
        <input type="button" value="cancel" onClick={()=>setShowCreate(false)} className="cursor-pointer"/>
      </pre>
      </form> 
      <p>{error}</p>
    </div>
  </>
  if(editProject)return <>

  <div className=" bg-pink-200 text-black w-screen  h-screen p-3 " >
      <form action=""  onSubmit={handleEdit}>
        title: <input type="text" value={editForm.title} onChange={(e)=>{setEditForm({...editForm,title:e.target.value})}} className="cursor-pointer outline-none p-1 rounded-lg "/>
        <br/>
        description: <input type="text" value={editForm.description} onChange={(e)=>{setEditForm({...editForm,description:e.target.value})}} className="cursor-pointer p-1 rounded-lg overflow-scroll outline-none "/>
        <br/>
        status: <select 
        value={editForm.status}
        onChange={(e)=>{setEditForm({...editForm,status:e.target.value})}}
        className="cursor-pointer p-2 rounded-lg"
        >
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Archived">Archived</option>


        </select>
        <br/>
        <div className="flex mt-2 ml-5 justify-evenly max-w-[20%]">

        <input type="submit" value="Edit" className="cursor-pointer bg-white px-4 py-2 rounded-lg "/><br/>
        
        <input type="button" value="cancel" onClick={()=>{
          setEditProject(null)
          setEditForm({
            title:"",
            description:"",
            status:""
          })
        }} className="cursor-pointer bg-white px-4 py-2 rounded-lg "
        />
   
        </div>
      </form> 
      <p>{error}</p>
    </div>
  </>
  return (
    <>
    {/* {editProject&&(
      <div>

      <form action=""  onSubmit={handleEdit}>
      <pre>
        title: <input type="text" onChange={(e)=>{setFormData({...formData,title:e.target.value})}} className="cursor-pointer "/>
        <br/>
        description: <input type="text" onChange={(e)=>{setFormData({...formData,description:e.target.value})}} className="cursor-pointer"/>
        <br/>
        status: <select 
        value={formData.status}
        onChange={(e)=>{
          setFormData({...formData,status:e.target.value});
        }}
        className="cursor-pointer"
        >
        +  <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Archived">Archived</option>


        </select>
        <br/>
        <input type="submit" value="Create" className="cursor-pointer"/><br/>
        
        <input type="button" value="cancel" onClick={()=>setShowCreate(false)} className="cursor-pointer"/>
      </pre>
      </form> 
      <p>{error}</p>
    </div>
    )} */}
      <section className="w-full h-screen bg-black text-white max-h-full overflow-auto">

    <div className="mx-2 mb-2 p-4 rounded-2xl border-black border-2 text-center font-mono text-4xl  ">
      DashBoard
    </div>
    <div className=" text-wrap px-5 border-2 max-w-screen rounded-2xl">
    <div className="m-2 flex justify-between px-2">
      <div>

      AllProjects:
      </div>
      <div>
        <button onClick={
          ()=>{
          setShowCreate(true)
          }}>Create</button>
      </div>
    </div>

      {
        projects.map((project)=>(
          <ProjectCard project={project} onEdit={()=>{
            setEditProject(project)
            setEditForm({
            title:project.title,
            description:project.description,
            status:project.status
          })
        }}/>
      ))
        
        
      }
      <div>{error}</div>

    </div>
      </section>
    </>
  )
}

export default Dashboard
