// import React from 'react'
import axios from "axios"
import { useEffect, useMemo, useState } from "react"
import { Navigate } from "react-router-dom"

function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)
    const [projects, setProjects] = useState([])
    const [projectLoading, setProjectLoading] = useState(true)
      const [activeFilter, setActiveFilter] = useState("All projects")
    const [isComposerOpen, setIsComposerOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [formError, setFormError] = useState("")
    const [newProject, setNewProject] = useState({ title: "", description: "" })

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const [userResponse, projectsResponse] = await Promise.all([
                    axios.get("http://localhost:3000/api/auth/me", { withCredentials: true }),
                    axios.get("http://localhost:3000/api/project", { withCredentials: true })
                ])
                setUser(userResponse.data.data)
                setProjects(projectsResponse.data.allProjects || [])
            } catch (requestError) {
                if (requestError.response?.status === 401 || requestError.response?.status === 403) setUser(null)
            } finally {
                setLoading(false)
                setProjectLoading(false)
            }
        }
        loadDashboard()
    }, [])

    const filteredProjects = useMemo(() => {
        if (activeFilter === "All projects") return projects
        return projects.filter((project) => project.status === activeFilter)
    }, [activeFilter, projects])

    const activeProjects = projects.filter((project) => project.status === "Active").length
    const completedProjects = projects.filter((project) => project.status === "Completed").length

    const handleCreateProject = async (event) => {
        event.preventDefault()
        if (!newProject.title.trim()) {
            setFormError("Give your project a name to get started.")
            return
        }
        setIsCreating(true)
        setFormError("")
        try {
            const response = await axios.post("http://localhost:3000/api/project", newProject, { withCredentials: true })
            setProjects((currentProjects) => [response.data.project, ...currentProjects])
            setNewProject({ title: "", description: "" })
            setIsComposerOpen(false)
        } catch (requestError) {
            setFormError(requestError.response?.data?.message || "We could not create that project.")
        } finally {
            setIsCreating(false)
        }
    }

    if (loading) return <main className="dashboard-loading"><span className="loading-pulse" />Preparing your workspace</main>
    if (!user) return <Navigate to="/login" replace />

    const firstName = user.name?.split(" ")[0] || "there"
    const initials = user.name?.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "DC"

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">dev<span>Collab</span><b>.</b></div>
        <nav className="dashboard-nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          <button className="nav-item nav-item-active"><span className="nav-icon">+</span>Overview</button>
          <button className="nav-item" onClick={() => setActiveFilter("All projects")}><span className="nav-icon">/</span>Projects <small>{projects.length}</small></button>
          <button className="nav-item"><span className="nav-icon">@</span>Team</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><span className="tip-mark">*</span><p><strong>Make room for good work.</strong> Keep your projects moving one clear step at a time.</p></div>
          <div className="sidebar-user"><div className="avatar avatar-small">{initials}</div><div><strong>{user.name}</strong><span>{user.email}</span></div><span className="more-mark">...</span></div>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div><p className="eyebrow">Friday, August 21, 2026</p><h1>Good morning, {firstName}.</h1></div>
          <div className="header-actions"><button className="icon-button" aria-label="Search">?</button><button className="avatar">{initials}</button></div>
        </header>

        <div className="dashboard-intro"><div><p className="eyebrow">Your workspace</p><h2>Make something <em>worth sharing.</em></h2><p>Keep your ideas in motion and your team in the loop.</p></div><button className="create-button" onClick={() => setIsComposerOpen(true)}><span>+</span> New project</button></div>

        <section className="stat-grid" aria-label="Project summary">
          <article className="stat-card stat-card-highlight"><p className="stat-label">All projects</p><strong>{projects.length}</strong><span>Everything you are building</span><i className="stat-line" /></article>
          <article className="stat-card"><p className="stat-label">Active now</p><strong>{activeProjects}</strong><span>Projects in progress</span><i className="stat-line" /></article>
          <article className="stat-card"><p className="stat-label">Completed</p><strong>{completedProjects}</strong><span>Ideas brought to life</span><i className="stat-line" /></article>
        </section>

        <section className="project-section"><div className="section-heading"><div><p className="eyebrow">Your work</p><h2>Projects</h2></div><div className="filter-tabs">{["All projects", "Active", "Completed", "Archived"].map((filter) => <button key={filter} className={activeFilter === filter ? "filter-active" : ""} onClick={() => setActiveFilter(filter)}>{filter}</button>)}</div></div>
          {projectLoading ? <div className="empty-state">Loading your projects...</div> : filteredProjects.length === 0 ? <div className="empty-state"><span className="empty-symbol">+</span><h3>{projects.length === 0 ? "Your first project starts here." : "Nothing in this view yet."}</h3><p>{projects.length === 0 ? "Turn the idea in your head into a space your team can build in." : "Try another filter or move a project into this status."}</p>{projects.length === 0 && <button className="create-button" onClick={() => setIsComposerOpen(true)}>Create a project <span>+</span></button>}</div> : <div className="project-list">{filteredProjects.map((project) => <article className="project-row" key={project._id}><div className="project-symbol">{project.title?.slice(0, 1).toUpperCase()}</div><div className="project-details"><h3>{project.title}</h3><p>{project.description || "No description yet"}</p></div><span className={`status-pill status-${project.status?.toLowerCase()}`}>{project.status}</span><span className="project-date">{new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span><button className="row-arrow" aria-label={`Open ${project.title}`}>-&gt;</button></article>)}</div>}
        </section>
      </section>

      {isComposerOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setIsComposerOpen(false)}><form className="project-composer" onSubmit={handleCreateProject}><button className="modal-close" type="button" onClick={() => setIsComposerOpen(false)} aria-label="Close">x</button><p className="eyebrow">New project</p><h2>Give the idea a place to grow.</h2><p className="composer-copy">Start with a name and a little context. You can shape the rest later.</p><div className="field-group"><label htmlFor="project-title">Project name</label><input id="project-title" autoFocus value={newProject.title} onChange={(event) => setNewProject({ ...newProject, title: event.target.value })} placeholder="e.g. Summer campaign" /></div><div className="field-group"><label htmlFor="project-description">Description <span>(optional)</span></label><textarea id="project-description" value={newProject.description} onChange={(event) => setNewProject({ ...newProject, description: event.target.value })} placeholder="What are you making together?" rows="4" /></div>{formError && <p className="form-error">{formError}</p>}<button className="submit-button" disabled={isCreating}>{isCreating ? "Creating project..." : "Create project"}<span>-&gt;</span></button></form></div>}
    </main>
  )
}

export default Dashboard
