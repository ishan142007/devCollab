import axios from "axios";
import { useEffect, useState } from "react";
import ProjectCard from "../components/ProjectCard";

const API_URL = "http://localhost:3000/api/project";
const EMPTY_FORM = { title: "", description: "", status: "Active" };
const STATUSES = ["Active", "Completed", "Archived"];

function Dashboard() {
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await axios.get(API_URL, { withCredentials: true });
        setProjects(data.allProjects ?? []);
      } catch (err) {
        setError(err.response?.data?.message || "We couldn't load your projects. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(API_URL, formData, { withCredentials: true });
      setProjects((current) => [data.project, ...current]);
      setFormData(EMPTY_FORM);
      setShowCreate(false);
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't create the project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.patch(
        `${API_URL}/${editProject._id}`,
        editForm,
        { withCredentials: true }
      );
      const updatedProject = data.updatedProject;
      setProjects((current) => current.map((project) =>
        project._id === updatedProject._id ? updatedProject : project
      ));
      setEditProject(null);
      setEditForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't update the project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeCreate = () => {
    setShowCreate(false);
    setFormData(EMPTY_FORM);
    setError("");
  };

  const closeEdit = () => {
    setEditProject(null);
    setEditForm(EMPTY_FORM);
    setError("");
  };

  const ProjectForm = ({ mode, values, onChange, onSubmit, onCancel }) => (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Project workspace</p>
          <h2 className="mt-1 text-2xl font-bold">{mode === "create" ? "Create a project" : "Edit project"}</h2>
          <p className="mt-2 text-sm text-slate-500">Add the details your team needs to stay aligned.</p>
        </div>

        <div className="space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            Project name
            <input required value={values.title} onChange={(e) => onChange({ ...values, title: e.target.value })}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="e.g. Website redesign" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea rows={4} value={values.description} onChange={(e) => onChange({ ...values, description: e.target.value })}
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="What is this project about?" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Status
            <select value={values.status} onChange={(e) => onChange({ ...values, status: e.target.value })}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );

  if (loading && projects.length === 0) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600"><p className="animate-pulse">Loading your projects…</p></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Workspace</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Projects</h1>
          </div>
          <button onClick={() => { setError(""); setShowCreate(true); }}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200">
            <span aria-hidden="true" className="mr-2">+</span>New project
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">All projects</h2>
            <p className="mt-1 text-sm text-slate-500">Keep track of work and project status.</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">{projects.length} {projects.length === 1 ? "project" : "projects"}</span>
        </div>

        {error && !showCreate && !editProject && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl text-indigo-600" aria-hidden="true">✦</div>
            <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Create your first project to organize work and follow its progress.</p>
            <button onClick={() => setShowCreate(true)} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">Create a project</button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project._id} project={project} onEdit={() => {
                setError("");
                setEditProject(project);
                setEditForm({ title: project.title, description: project.description, status: project.status });
              }} />
            ))}
          </div>
        )}
      </section>

      {showCreate && <ProjectForm mode="create" values={formData} onChange={setFormData} onSubmit={handleCreate} onCancel={closeCreate} />}
      {editProject && <ProjectForm mode="edit" values={editForm} onChange={setEditForm} onSubmit={handleEdit} onCancel={closeEdit} />}
    </main>
  );
}

export default Dashboard;
