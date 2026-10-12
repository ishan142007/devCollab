import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiUrl } from "../config/api";
import useDashboardTheme from "../hooks/useDashboardTheme";
import "../styles/evidenceProfile.css";

function EvidenceProfile() {
  const { username } = useParams();
  const { isDark } = useDashboardTheme();
  const [result, setResult] = useState({ username: null, profile: null, loading: true, error: "" });

  useEffect(() => {
    let mounted = true;
    axios.get(`${apiUrl}/api/profiles/${encodeURIComponent(username)}`)
      .then(({ data }) => { if (mounted) setResult({ username, profile: data.data, loading: false, error: "" }); })
      .catch((requestError) => {
        if (mounted) setResult({
          username,
          profile: null,
          loading: false,
          error: requestError.response?.status === 404
            ? "This public profile is unavailable."
            : requestError.response?.data?.message || "Couldn't load this profile."
        });
      })
    return () => { mounted = false; };
  }, [username]);

  const currentResult = result.username === username
    ? result
    : { profile: null, loading: true, error: "" };
  const { profile, loading, error } = currentResult;
  if (loading) return <main className={`evidence-profile-theme min-h-screen px-5 py-12 ${isDark ? "is-dark" : "bg-slate-50 text-slate-900"}`}><div className="mx-auto max-w-5xl"><p role="status">Loading developer profile…</p></div></main>;
  if (error || !profile) return <main className={`evidence-profile-theme min-h-screen px-5 py-12 ${isDark ? "is-dark" : "bg-slate-50 text-slate-900"}`}><div className="mx-auto max-w-5xl"><p role="alert" className="rounded-lg bg-rose-100 p-4 text-rose-800">{error || "This public profile is unavailable."}</p><Link to="/" className="mt-5 inline-block text-sm font-semibold text-indigo-600">Go to DevCollab</Link></div></main>;

  const featured = profile.projects.filter((project) => project.featured);
  const others = profile.projects.filter((project) => !project.featured);

  return (
    <main className={`evidence-profile-theme min-h-screen px-4 py-10 ${isDark ? "is-dark" : "bg-slate-50 text-slate-900"} sm:px-8`}>
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {profile.user.avatar ? <img src={profile.user.avatar} alt="" className="h-24 w-24 rounded-2xl object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-indigo-100 text-3xl font-bold text-indigo-700">{profile.user.name?.slice(0, 1)?.toUpperCase() || "D"}</div>}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">DevCollab Evidence Profile</p>
              <h1 className="mt-2 text-3xl font-bold">{profile.user.name}</h1>
              <p className="mt-1 text-sm text-slate-500">@{profile.user.username}</p>
              {profile.user.bio && <p className="mt-4 max-w-2xl whitespace-pre-wrap text-slate-700">{profile.user.bio}</p>}
              {profile.user.technologies.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{profile.user.technologies.map((technology) => <span key={technology} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{technology}</span>)}</div>}
            </div>
            {profile.user.githubUrl && <a href={profile.user.githubUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold">GitHub @{profile.user.githubUsername}</a>}
          </div>
        </header>

        <section className="mt-8">
          <div className="mb-4"><h2 className="text-xl font-bold">Featured projects</h2><p className="mt-1 text-sm text-slate-600">Project descriptions and technology tags are provided by the developer.</p></div>
          {featured.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-7 text-sm text-slate-600">No projects have been featured yet.</p> : <div className="grid gap-4 md:grid-cols-2">{featured.map((project) => <ProjectCard key={project.id} project={project} />)}</div>}
          {others.length > 0 && <><h2 className="mb-4 mt-8 text-xl font-bold">Other public projects</h2><div className="grid gap-4 md:grid-cols-2">{others.map((project) => <ProjectCard key={project.id} project={project} />)}</div></>}
        </section>

        <section className="mt-8">
          <div className="mb-4"><h2 className="text-xl font-bold">GitHub evidence</h2><p className="mt-1 text-sm text-slate-600">GitHub-confirmed records attributed by connected GitHub account ID. Evidence does not establish skill level or code quality.</p></div>
          {profile.evidence.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-7 text-sm text-slate-600">No public contribution evidence is available.</p> : <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">{profile.evidence.map((item, index) => <li key={`${item.type}-${item.url}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.type === "pull_request" ? (item.status === "merged" ? "Merged pull request" : `${item.status} pull request`) : "Commit attributed to GitHub account"} · {item.projectTitle} · {new Date(item.occurredAt).toLocaleDateString()}</p></div><a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-indigo-600 hover:underline">View GitHub record</a></li>)}</ul>}
          {profile.evidenceTruncated && <p className="mt-2 text-xs text-slate-500">Showing the 50 most recent public evidence records.</p>}
        </section>
        <footer className="mt-10 text-center text-xs text-slate-500">GitHub activity is evidence of recorded activity, not a rating of professional competence.</footer>
      </div>
    </main>
  );
}

function ProjectCard({ project }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold">{project.title}</h3>{project.githubRepository && <a href={project.githubRepository.url} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-semibold text-indigo-600 hover:underline">GitHub</a>}</div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{project.description || "No description provided."}</p>
      {project.technologies.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{project.technologies.map((technology) => <span key={technology} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{technology}</span>)}</div>}
    </article>
  );
}

export default EvidenceProfile;
