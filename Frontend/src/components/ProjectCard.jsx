

const ProjectCard = ({ project, onEdit, onDelete, deleting = false }) => {
  return (
    <>
       <div className="mx-2 border-2 rounded-2xl p-4 transition hover:scale-105 w-[97%] cursor-pointer flex justify-between">
        <div>

            <div>{project.title}</div>
            <div>{project.description}</div>
            <div>{project.status}</div>
        </div>
        <div >
          <button type="button" onClick={() => onDelete(project._id)} disabled={deleting}>Delete</button>
          <br/>
          <button type="button" onClick={onEdit}>Edit</button>
        </div>
          </div>
    </>
  )
}

export default ProjectCard
