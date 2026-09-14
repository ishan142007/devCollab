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

  return (
    <>
    <div className="m-2 ">
      DashBoard
    </div>
    <div className="">
      all projects:
      {
        projects.map((project)=>(
          <div key={project._id}>
            <div>{project.title}</div>
            <div>{project.description}</div>
            <div>{project.status}</div>
          </div>
        ))
      }

    </div>
    <div className="m-2">
      footer
    </div>
    </>
  )
}

export default Dashboard
