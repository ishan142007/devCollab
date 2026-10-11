import axios from "axios";
import { useEffect, useState } from "react";
import ProjectCard from "../components/ProjectCard";

const API_URL = "http://localhost:3000/api/project";
const EMPTY_FORM = { title: "", description: "", status: "Active" };
const STATUSES = ["Active", "Completed", "Archived"];

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("dashboard-theme") || "light");
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [deleteProject, setDeleteProject] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const isDark = theme === "dark";
  const surface = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const panel = isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white";
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  useEffect(() => {
    let active = true;
    axios.get(API_URL, { withCredentials: true })
      .then(({ data }) => { if (active) setProjects(data.allProjects ?? []); })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Couldn't load projects. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard-theme", theme);
  }, [theme]);

  const closeDialog = () => {
    setShowCreate(false);
    setEditProject(null);
    setDeleteProject(null);
    setForm(EMPTY_FORM);
    setError("");
  };

  const openCreate = () => { setError(""); setForm(EMPTY_FORM); setShowCreate(true); };
  const openEdit = (project) => {
    setError("");
    setForm({ title: project.title ?? "", description: project.description ?? "", status: project.status ?? "Active" });
    setEditProject(project);
  };

  const saveProject = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editProject) {
        const { data } = await axios.patch(`${API_URL}/${editProject._id}`, form, { withCredentials: true });
        const updated = data.updatedProject;
        setProjects((current) => current.map((project) => project._id === updated._id ? updated : project));
      } else {
        const { data } = await axios.post(API_URL, form, { withCredentials: true });
        setProjects((current) => [data.project, ...current]);
      }
      closeDialog();
    } catch (err) {
      setError(err.response?.data?.message || `Couldn't ${editProject ? "update" : "create"} the project. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteProject) return;
    setSaving(true);
    setError("");
    try {
      await axios.delete(`${API_URL}/${deleteProject._id}`, { withCredentials: true });
      setProjects((current) => current.filter((project) => project._id !== deleteProject._id));
      closeDialog();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't delete the project. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${surface}`}>
        <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
          <span className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium">Loading your workspace…</p>
        </div>
      </main>
    );
  }

  const dialogOpen = showCreate || Boolean(editProject) || Boolean(deleteProject);

  return (
    <main className={`min-h-screen transition-colors duration-200 ${surface}`}>
      <header className={`border-b ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-500">Workspace</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Projects</h1>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}>
              {isDark ? "☀ Light" : "☾ Dark"}
            </button>
            <button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300">
              <span aria-hidden="true" className="mr-2">＋</span>New project
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-6 flex items-end justify-between">
          <div><h2 className="text-lg font-semibold">All projects</h2><p className={`mt-1 text-sm ${muted}`}>Keep track of work and project status.</p></div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"}`}>
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>

        {error && !dialogOpen && <p role="alert" className="mb-5 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-800">{error}</p>}
        {projects.length === 0 ? (
          <div className={`rounded-2xl border border-dashed px-6 py-16 text-center ${panel}`}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-2xl text-indigo-700" aria-hidden="true">✦</div>
            <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
            <p className={`mx-auto mt-2 max-w-sm text-sm ${muted}`}>Create your first project to organize work and follow its progress.</p>
            <button onClick={openCreate} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Create a project</button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project._id} className="relative">
                <ProjectCard project={project} onEdit={() => openEdit(project)} />
                <button type="button" onClick={() => { setError(""); setDeleteProject(project); }}
                  aria-label={`Delete ${project.title}`} title="Delete project"
                  className="absolute right-3 top-3 z-[1] rounded-lg border border-rose-200 bg-white/95 px-3 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {dialogOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) closeDialog(); }}>
          {deleteProject ? (
            <section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${panel}`}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-xl text-rose-700" aria-hidden="true">!</div>
              <h2 id="delete-title" className="text-xl font-bold">Delete this project?</h2>
              <p className={`mt-2 text-sm leading-6 ${muted}`}>“{deleteProject.title}” will be permanently removed. This action cannot be undone.</p>
              {error && <p role="alert" className="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}
              <div className="mt-7 flex justify-end gap-3">
                <button type="button" disabled={saving} onClick={closeDialog} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold ${isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}>Cancel</button>
                <button type="button" disabled={saving} onClick={confirmDelete} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{saving ? "Deleting…" : "Delete project"}</button>
              </div>
            </section>
          ) : (
            <form onSubmit={saveProject} className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl sm:p-8 ${panel}`}>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-500">Project workspace</p>
                <h2 className="mt-1 text-2xl font-bold">{editProject ? "Edit project" : "Create a project"}</h2>
                <p className={`mt-2 text-sm ${muted}`}>Add the details your team needs to stay aligned.</p>
              </div>
              <div className="space-y-5">
                <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>Project name
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Website redesign"
                    className={`mt-2 w-full rounded-lg border px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 ${isDark ? "border-slate-700 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-900"}`} />
                </label>
                <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>Description
                  <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this project about?"
                    className={`mt-2 w-full resize-y rounded-lg border px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 ${isDark ? "border-slate-700 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-900"}`} />
                </label>
                <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`mt-2 w-full rounded-lg border px-3 py-2.5 outline-none focus:border-indigo-500 ${isDark ? "border-slate-700 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-900"}`}>
                    {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              </div>
              {error && <p role="alert" className="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" disabled={saving} onClick={closeDialog} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold ${isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : editProject ? "Save changes" : "Create project"}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </main>
  );
}

export default Dashboard;
