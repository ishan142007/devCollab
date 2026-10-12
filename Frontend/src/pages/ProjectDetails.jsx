import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_URL = "http://localhost:3000/api/project";
const EMPTY_TASK = { name: "", description: "", status: "Active", priority: "Medium", assignee: "" };

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("dashboard-theme") === "dark");
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [savingTask, setSavingTask] = useState(false);

  const surface = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const panel = isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const inputStyle = isDark
    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20";

  const statusStyle = useMemo(() => {
    if (!project) return "";
    return project.status === "Completed"
      ? (isDark ? "bg-blue-950 text-blue-300" : "bg-blue-50 text-blue-700")
      : project.status === "Archived"
        ? (isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")
        : (isDark ? "bg-emerald-950 text-emerald-300" : "bg-emerald-50 text-emerald-700");
  }, [project, isDark]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setTaskLoading(true);
    setError("");
    setTaskError("");

    const loadProjectData = async () => {
      try {
        const projectResponse = await axios.get(`${API_URL}/${id}`, { withCredentials: true });
        if (!active) return;
        setProject(projectResponse.data.item);
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || "Couldn't load this project. Please try again.");
      } finally {
        if (active) setLoading(false);
      }

      try {
        const taskResponse = await axios.get(`${API_URL}/${id}/task`, { withCredentials: true });
        if (!active) return;
        setTasks(taskResponse.data.tasks ?? []);
      } catch (err) {
        if (!active) return;
        setTaskError(err.response?.data?.message || "Couldn't load the tasks for this project.");
      } finally {
        if (active) setTaskLoading(false);
      }
    };

    loadProjectData();

    return () => {
      active = false;
    };
  }, [id]);

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setTaskForm(EMPTY_TASK);
  };

  const handleTaskChange = (event) => {
    const { name, value } = event.target;
    setTaskForm((current) => ({ ...current, [name]: value }));
  };

  const saveTask = async (event) => {
    event.preventDefault();
    setSavingTask(true);
    setTaskError("");

    const payload = {
      ...taskForm,
      name: taskForm.name.trim(),
      description: taskForm.description?.trim() ?? "",
      assignee: taskForm.assignee?.trim() ? taskForm.assignee.trim() : undefined
    };

    if (!payload.name) {
      setTaskError("Task name is required.");
      setSavingTask(false);
      return;
    }

    try {
      if (editingTaskId) {
        const { data } = await axios.patch(`${API_URL}/${id}/task/${editingTaskId}`, payload, { withCredentials: true });
        setTasks((current) => current.map((task) => (task._id === editingTaskId ? data.updatedTask : task)));
      } else {
        const { data } = await axios.post(`${API_URL}/${id}/task`, payload, { withCredentials: true });
        setTasks((current) => [data.task, ...current]);
      }
      resetTaskForm();
    } catch (err) {
      setTaskError(err.response?.data?.message || "Couldn't save this task. Please try again.");
    } finally {
      setSavingTask(false);
    }
  };

  const startEditTask = (task) => {
    setEditingTaskId(task._id);
    setTaskForm({
      name: task.name ?? "",
      description: task.description ?? "",
      status: task.status ?? "Active",
      priority: task.priority ?? "Medium",
      assignee: task.assignee ?? ""
    });
    setTaskError("");
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`${API_URL}/${id}/task/${taskId}`, { withCredentials: true });
      setTasks((current) => current.filter((task) => task._id !== taskId));
      if (editingTaskId === taskId) {
        resetTaskForm();
      }
    } catch (err) {
      setTaskError(err.response?.data?.message || "Couldn't delete this task. Please try again.");
    }
  };

  const taskStatusClasses = (status) => {
    if (status === "Completed") return isDark ? "bg-emerald-950 text-emerald-300" : "bg-emerald-100 text-emerald-700";
    if (status === "Pending") return isDark ? "bg-amber-950 text-amber-300" : "bg-amber-100 text-amber-700";
    return isDark ? "bg-sky-950 text-sky-300" : "bg-sky-100 text-sky-700";
  };

  const taskPriorityClasses = (priority) => {
    if (priority === "High") return isDark ? "bg-rose-950 text-rose-300" : "bg-rose-100 text-rose-700";
    if (priority === "Low") return isDark ? "bg-emerald-950 text-emerald-300" : "bg-emerald-100 text-emerald-700";
    return isDark ? "bg-violet-950 text-violet-300" : "bg-violet-100 text-violet-700";
  };

  return (
    <main className={`min-h-screen transition-colors duration-200 ${surface}`}>
      <header className={`border-b ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-500">Workspace</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Project details</h1>
          </div>
          <button type="button" onClick={() => { const next = !isDark; setIsDark(next); localStorage.setItem("dashboard-theme", next ? "dark" : "light"); }}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`} title={`Switch to ${isDark ? "light" : "dark"} mode`}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${isDark ? "border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}>
            {isDark ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="m16.5 4 .45 1.35L18.3 6l-1.35.45L16.5 7.8l-.45-1.35L14.7 6l1.35-.65L16.5 4Z" fill="currentColor"/></svg>
            )}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          <span aria-hidden="true">←</span> Back to projects
        </Link>

        {loading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className={`text-sm font-medium ${muted}`}>Loading project details…</p>
          </div>
        ) : error ? (
          <div role="alert" className={`rounded-2xl border p-8 text-center ${panel}`}>
            <h2 className="text-xl font-bold">Project unavailable</h2>
            <p className={`mt-2 text-sm ${muted}`}>{error}</p>
            <Link to="/" className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Return to projects</Link>
          </div>
        ) : project && (
          <div className="space-y-8">
            <article className={`overflow-hidden rounded-2xl border shadow-sm ${panel}`}>
              <div className="h-2 bg-gradient-to-r from-indigo-600 via-violet-500 to-sky-400" />
              <div className="p-6 sm:p-10">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-indigo-500">Project overview</p>
                    <h2 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">{project.title}</h2>
                  </div>
                  <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${statusStyle}`}>
                    <span className={`h-2 w-2 rounded-full ${project.status === "Completed" ? "bg-blue-500" : project.status === "Archived" ? "bg-slate-400" : "bg-emerald-500"}`} />
                    {project.status || "Active"}
                  </span>
                </div>

                <div className={`my-8 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`} />
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-500">Description</h3>
                  <p className={`mt-3 whitespace-pre-wrap text-base leading-7 ${muted}`}>{project.description || "No description has been added to this project yet."}</p>
                </section>

                <div className={`mt-9 grid gap-4 border-t pt-6 sm:grid-cols-2 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Status</p>
                    <p className="mt-1 font-medium">{project.status || "Active"}</p>
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Project ID</p>
                    <p className={`mt-1 break-all font-mono text-sm ${muted}`}>{project._id}</p>
                  </div>
                </div>
              </div>
            </article>

            <section className={`rounded-2xl border p-5 shadow-sm ${panel}`}>
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-indigo-500">Tasks</p>
                  <h3 className="mt-1 text-xl font-bold">Project tasks</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${isDark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                </span>
              </div>

              <form onSubmit={saveTask} className="mb-6 space-y-4 rounded-2xl border border-dashed p-4 md:p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium">
                    <span className="mb-1.5 block">Task name</span>
                    <input type="text" name="name" value={taskForm.name} onChange={handleTaskChange} className={`w-full rounded-lg border px-3 py-2.5 focus:outline-none focus:ring-4 ${inputStyle}`} placeholder="Ship onboarding flow" />
                  </label>

                  <label className="block text-sm font-medium">
                    <span className="mb-1.5 block">Assignee user ID</span>
                    <input type="text" name="assignee" value={taskForm.assignee} onChange={handleTaskChange} className={`w-full rounded-lg border px-3 py-2.5 focus:outline-none focus:ring-4 ${inputStyle}`} placeholder="Optional" />
                  </label>
                </div>

                <label className="block text-sm font-medium">
                  <span className="mb-1.5 block">Description</span>
                  <textarea name="description" value={taskForm.description} onChange={handleTaskChange} rows="3" className={`w-full rounded-lg border px-3 py-2.5 focus:outline-none focus:ring-4 ${inputStyle}`} placeholder="Add detailed task notes..." />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium">
                    <span className="mb-1.5 block">Status</span>
                    <select name="status" value={taskForm.status} onChange={handleTaskChange} className={`w-full rounded-lg border px-3 py-2.5 focus:outline-none focus:ring-4 ${inputStyle}`}>
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium">
                    <span className="mb-1.5 block">Priority</span>
                    <select name="priority" value={taskForm.priority} onChange={handleTaskChange} className={`w-full rounded-lg border px-3 py-2.5 focus:outline-none focus:ring-4 ${inputStyle}`}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </label>
                </div>

                {taskError && <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700">{taskError}</p>}

                <div className="flex flex-wrap items-center gap-3">
                  <button type="submit" disabled={savingTask} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {savingTask ? (editingTaskId ? "Saving changes..." : "Creating task...") : (editingTaskId ? "Update task" : "Create task")}
                  </button>
                  {editingTaskId && (
                    <button type="button" onClick={resetTaskForm} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold ${isDark ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {taskLoading ? (
                <div className="flex items-center justify-center gap-3 py-8" role="status" aria-live="polite">
                  <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                  <p className={`text-sm ${muted}`}>Loading tasks…</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className={`rounded-2xl border border-dashed px-4 py-10 text-center ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <p className="text-lg font-semibold">No tasks yet</p>
                  <p className={`mt-2 text-sm ${muted}`}>Create the first task for this project and track its progress.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <article key={task._id} className={`rounded-2xl border p-4 ${isDark ? "border-slate-700 bg-slate-950/50" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-semibold">{task.name}</h4>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${taskStatusClasses(task.status)}`}>{task.status || "Active"}</span>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${taskPriorityClasses(task.priority)}`}>{task.priority || "Medium"}</span>
                          </div>
                          <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${muted}`}>{task.description || "No description."}</p>
                          {task.assignee && (
                            <p className={`mt-3 text-xs font-medium uppercase tracking-wide ${muted}`}>
                              Assignee: {task.assignee}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => startEditTask(task)} className="rounded-lg border border-indigo-500 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">Edit</button>
                          <button type="button" onClick={() => deleteTask(task._id)} className="rounded-lg border border-rose-500 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

export default ProjectDetails;

