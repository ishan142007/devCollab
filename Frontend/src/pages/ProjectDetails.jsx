import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_URL = "http://localhost:3000/api/project";

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("dashboard-theme") === "dark");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    // The dashboard's existing API returns allProjects, so use it to find the selected project.
    axios.get(API_URL, { withCredentials: true })
      .then(({ data }) => {
        if (!active) return;
        const found = (data.allProjects ?? []).find((item) => String(item._id) === String(id));
        if (found) setProject(found);
        else setError("This project could not be found. It may have been removed.");
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || "Couldn't load this project. Please try again.");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [id]);

  const surface = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const panel = isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const statusStyle = project?.status === "Completed"
    ? (isDark ? "bg-blue-950 text-blue-300" : "bg-blue-50 text-blue-700")
    : project?.status === "Archived"
      ? (isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")
      : (isDark ? "bg-emerald-950 text-emerald-300" : "bg-emerald-50 text-emerald-700");

  return (
    <main className={`min-h-screen transition-colors duration-200 ${surface}`}>
      <header className={`border-b ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
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

      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/" className={`mb-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700`}>
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
                <div><p className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Status</p><p className="mt-1 font-medium">{project.status || "Active"}</p></div>
                <div><p className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Project ID</p><p className={`mt-1 break-all font-mono text-sm ${muted}`}>{project._id}</p></div>
              </div>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

export default ProjectDetails;

