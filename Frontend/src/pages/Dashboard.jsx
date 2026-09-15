import axios from "axios"
import { useEffect, useState } from "react"




function Dashboard() {
  const [projects, setprojects] = useState([])
  const [loading, setloading] = useState(true)
  const [error, seterror] = useState("")
  useEffect(()=>{
    const showprojects=async()=>{
      setloading(true);
      try {
        
        const response=await axios.get("http://localhost:3000/api/project",{withCredentials:true});
        setprojects(response.data.allProjects);
        if(!projects)seterror("no projects found");
      } catch (error) {
        seterror(error)
      }finally{
        setloading(false)
      }
    }
    showprojects();
  },[])
  if(loading)return <>.........loading..........</>
//  const addProject=async()=>{
//   const response=await axios.post('http://localhost:3000/api/project',{},{withCredentials:true})
//  }
const handleCreate=async()=>{
  
}
  return (
    <>
    
    <section className="w-full h-screen bg-black text-white">

    <div className="mx-2 mb-2 p-4 rounded-2xl border-black border-2 text-center font-mono text-4xl  ">
      DashBoard
    </div>
    <div className=" text-wrap px-5 border-2 max-w-screen rounded-2xl">
    <div className="m-2 flex justify-between px-2">
      <div>

      AllProjects:
      </div>
      <div>
        <button onClick={handleCreate}>Create</button>
      </div>
    </div>

      {
        projects.map((project)=>(
          <div key={project._id} className="mx-2 border-2 rounded-2xl p-4 transition hover:scale-105 w-[97%] cursor-pointer">
            <div>{project.title}</div>
            <div>{project.description}</div>
            <div>{project.status}</div>
          </div>
        ))
        
        
      }
      <div>{error}</div>

    </div>
      </section>
    </>
  )
}

export default Dashboard
