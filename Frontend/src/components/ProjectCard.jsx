

const ProjectCard = ({project,onEdit}) => {
  const handleDelete=async () => {
    
  }
  
  return (
    <>
       <div key={project._id} className="mx-2 border-2 rounded-2xl p-4 transition hover:scale-105 w-[97%] cursor-pointer flex justify-between">
        <div>

            <div>{project.title}</div>
            <div>{project.description}</div>
            <div>{project.status}</div>
        </div>
        <div >
          <button onClick={handleDelete}>delete</button>
          <br/>
          <button onClick={onEdit}>Edit</button>
        </div>
          </div>
    </>
  )
}

export default ProjectCard
