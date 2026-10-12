import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import { apiUrl } from "../config/api";
import useDashboardTheme from "../hooks/useDashboardTheme";
import "../styles/evidenceProfile.css";

const API_ROOT = `${apiUrl}/api`;
const EMPTY_PROFILE = {
  name: "",
  bio: "",
  avatar: "",
  technologies: "",
  profileVisibility: "private",
  username: "",
  githubUsername: "",
  githubConnected: false,
  email: ""
};

function ProfileSettings() {
  const { updateUser } = useContext(AuthContext);
  const { isDark } = useDashboardTheme();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [projects, setProjects] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [repositorySync, setRepositorySync] = useState({ status: "never", message: "" });
  const [repositoryPagination, setRepositoryPagination] = useState({ page: 1, total: 0, hasMore: false });
  const [repositoryQuery, setRepositoryQuery] = useState("");
  const [repositorySearch, setRepositorySearch] = useState("");
  const [repositoryFilter, setRepositoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadProfileData = async () => {
    const [userResponse, profileResponse, repositoryResponse] = await Promise.all([
      axios.get(`${API_ROOT}/auth/me`, { withCredentials: true }),
      axios.get(`${API_ROOT}/profile/me`, { withCredentials: true }),
      axios.get(`${API_ROOT}/github/repositories`, { withCredentials: true })
    ]);
    const user = userResponse.data.data;
    setProfile({
      name: user.name ?? "",
      bio: user.bio ?? "",
      avatar: user.avatar ?? "",
      technologies: (user.technologies ?? []).join(", "),
      profileVisibility: user.profileVisibility ?? "private",
      username: user.username ?? "",
      githubUsername: user.githubUsername ?? "",
      githubConnected: Boolean(user.githubConnected),
      email: user.email ?? ""
    });
    updateUser(user);
    setProjects(profileResponse.data.data.projects ?? []);
    setEvidence(profileResponse.data.data.evidence ?? []);
    setRepositories(repositoryResponse.data.data ?? []);
    setRepositorySync(repositoryResponse.data.sync ?? { status: "never", message: "" });
    setRepositoryPagination(repositoryResponse.data.pagination ?? { page: 1, total: 0, hasMore: false });
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      axios.get(`${API_ROOT}/auth/me`, { withCredentials: true }),
      axios.get(`${API_ROOT}/profile/me`, { withCredentials: true }),
      axios.get(`${API_ROOT}/github/repositories`, { withCredentials: true })
    ]).then(([userResponse, profileResponse, repositoryResponse]) => {
      if (!mounted) return;
      const user = userResponse.data.data;
      setProfile({
        name: user.name ?? "",
        bio: user.bio ?? "",
        avatar: user.avatar ?? "",
        technologies: (user.technologies ?? []).join(", "),
        profileVisibility: user.profileVisibility ?? "private",
        username: user.username ?? "",
        githubUsername: user.githubUsername ?? "",
        githubConnected: Boolean(user.githubConnected),
        email: user.email ?? ""
      });
      updateUser(user);
      setProjects(profileResponse.data.data.projects ?? []);
      setEvidence(profileResponse.data.data.evidence ?? []);
      setRepositories(repositoryResponse.data.data ?? []);
      setRepositorySync(repositoryResponse.data.sync ?? { status: "never", message: "" });
      setRepositoryPagination(repositoryResponse.data.pagination ?? { page: 1, total: 0, hasMore: false });
    }).catch((requestError) => {
      if (mounted) setError(requestError.response?.data?.message || "Couldn't load your evidence profile.");
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [updateUser]);

  useEffect(() => {
    if (repositorySync.status !== "in_progress" && activeProjectId !== "discovery") return undefined;
    const timer = window.setInterval(() => {
      axios.get(`${API_ROOT}/github/repositories`, { withCredentials: true }).then(({ data }) => {
        setRepositories(data.data ?? []);
        setRepositorySync(data.sync ?? { status: "never", message: "" });
        setRepositoryPagination(data.pagination ?? { page: 1, total: 0, hasMore: false });
      }).catch((requestError) => {
        setError(requestError.response?.data?.message || "Couldn't refresh repository discovery status.");
      });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [repositorySync.status, activeProjectId]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const technologies = profile.technologies.split(",").map((tag) => tag.trim()).filter(Boolean);
      const { data } = await axios.patch(`${API_ROOT}/auth/me`, {
        name: profile.name.trim(),
        bio: profile.bio.trim(),
        avatar: profile.avatar.trim(),
        technologies,
        profileVisibility: profile.profileVisibility
      }, { withCredentials: true });
      setProfile((current) => ({
        ...current,
        technologies: data.data.technologies.join(", "),
        username: data.data.username,
        githubUsername: data.data.githubUsername,
        githubConnected: data.data.githubConnected,
        email: data.data.email ?? ""
      }));
      updateUser(data.data);
      setMessage("Your profile details were saved.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const updateProject = async (project, changes) => {
    setActiveProjectId(project.id);
    setError("");
    setMessage("");
    try {
      const { data } = await axios.patch(`${API_ROOT}/project/${project.id}`, changes, { withCredentials: true });
      const updated = data.updatedProject;
      setProjects((current) => current.map((entry) => entry.id === project.id ? {
        ...entry,
        featured: updated.featured,
        visibility: updated.visibility,
        title: updated.title
      } : entry));
      setMessage("Project visibility and featured status updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn't update this project.");
    } finally {
      setActiveProjectId("");
    }
  };

  const unlinkRepository = async (projectId) => {
    const repositoryId = projects.find((project) => project.id === projectId)?.githubRepository?.id;
    setActiveProjectId(projectId);
    setError("");
    setMessage("");
    try {
      await axios.delete(`${API_ROOT}/project/${projectId}/github/repository`, { withCredentials: true });
      setProjects((current) => current.map((project) => project.id === projectId
        ? { ...project, githubRepository: null, githubSync: null }
        : project));
      if (repositoryId) {
        setRepositories((current) => current.map((repository) => repository.githubRepositoryId === repositoryId
          ? { ...repository, linkedProject: null }
          : repository));
      }
      setMessage("Repository unlinked. Existing evidence remains private to you and is no longer shown publicly.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn't unlink that repository.");
    } finally {
      setActiveProjectId("");
    }
  };

  const synchronize = async (projectId) => {
    setActiveProjectId(projectId);
    setError("");
    setMessage("");
    try {
      const { data } = await axios.post(`${API_ROOT}/project/${projectId}/github/sync`, {}, { withCredentials: true });
      await loadProfileData();
      const summary = data.data;
      const details = [
        `${summary.processed} attributable records processed`,
        `${summary.omittedUnattributed} records without a linked DevCollab identity omitted`,
        summary.failedTypes.length ? `failed types: ${summary.failedTypes.join(", ")}` : "",
        Object.values(summary.pagesTruncated).some(Boolean) ? "the result limit was reached; older records were not checked" : ""
      ].filter(Boolean).join("; ");
      setMessage(`Sync ${summary.status}: ${details}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn't synchronize GitHub evidence.");
    } finally {
      setActiveProjectId("");
    }
  };

  const loadRepositories = async ({ page = 1, q = repositoryQuery, filter = repositoryFilter } = {}) => {
    const { data } = await axios.get(`${API_ROOT}/github/repositories`, {
      params: { page, q, filter: filter === "all" ? undefined : filter },
      withCredentials: true
    });
    setRepositories(data.data ?? []);
    setRepositorySync(data.sync ?? { status: "never", message: "" });
    setRepositoryPagination(data.pagination ?? { page: 1, total: 0, hasMore: false });
  };

  const refreshRepositories = async () => {
    setActiveProjectId("discovery");
    setError("");
    setMessage("");
    setRepositorySync((current) => ({
      ...current,
      status: "in_progress",
      message: "Refreshing public GitHub repositories…"
    }));
    try {
      const { data } = await axios.post(`${API_ROOT}/github/repositories/refresh`, {}, { withCredentials: true });
      setMessage(data.data.truncated
        ? `Repository refresh reached its limit after discovering ${data.data.discovered} repositories.`
        : `Repository refresh complete: ${data.data.discovered} public repositories found.`);
      await loadRepositories({ page: 1 });
    } catch (requestError) {
      try {
        const { data } = await axios.get(`${API_ROOT}/github/repositories`, { withCredentials: true });
        setRepositories(data.data ?? []);
        setRepositorySync(data.sync ?? { status: "failed", message: "" });
        setRepositoryPagination(data.pagination ?? { page: 1, total: 0, hasMore: false });
        if (requestError.response?.status === 409 && data.sync?.status === "in_progress") {
          setMessage("A GitHub repository refresh is already running. This page will update when it finishes.");
        } else {
          setError(requestError.response?.data?.message || "Couldn't refresh GitHub repositories.");
        }
      } catch {
        setError(requestError.response?.data?.message || "Couldn't refresh GitHub repositories.");
      }
    } finally {
      setActiveProjectId("");
    }
  };

  const linkDiscoveredRepository = async (repository, projectId) => {
    if (projectId === (repository.linkedProject?.id || "")) return;
    setActiveProjectId(repository.id);
    setError("");
    setMessage("");
    try {
      const { data } = await axios.patch(`${API_ROOT}/github/repositories/${repository.id}/link`, {
        projectId: projectId || null
      }, { withCredentials: true });
      const linkedProject = data.data.repository.linkedProject;
      setRepositories((current) => current.map((entry) => entry.id === repository.id
        ? { ...entry, linkedProject }
        : entry));
      setProjects((current) => current.map((project) => {
        if (project.id === linkedProject?.id) {
          return {
            ...project,
            githubRepository: {
              id: repository.githubRepositoryId,
              ownerLogin: repository.ownerLogin,
              fullName: repository.fullName,
              url: repository.url
            }
          };
        }
        if (project.id === repository.linkedProject?.id) {
          return { ...project, githubRepository: null, githubSync: null };
        }
        return project;
      }));
      setMessage(linkedProject
        ? `${repository.fullName} linked to ${projects.find((project) => project.id === linkedProject.id)?.title || "the selected project"}.`
        : `${repository.fullName} unlinked from its project.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn't update the repository link.");
    } finally {
      setActiveProjectId("");
    }
  };

  const verifyRepository = async (repository) => {
    setActiveProjectId(repository.id);
    setError("");
    setMessage("");
    try {
      const { data } = await axios.post(`${API_ROOT}/github/repositories/${repository.id}/verify`, {}, { withCredentials: true });
      setRepositories((current) => current.map((entry) => entry.id === repository.id
        ? {
          ...entry,
          contributionStatus: data.data.status === "partial"
            ? (data.data.matchedRecords ? "verified" : "failed")
            : data.data.status,
          contributionTypes: data.data.contributionTypes
        }
        : entry));
      const recentLimitReached = Object.values(data.data.truncated).some(Boolean);
      setMessage(data.data.matchedRecords
        ? `${repository.fullName}: ${data.data.matchedRecords} GitHub-attributed records verified${data.data.failedTypes.length ? `; unable to check ${data.data.failedTypes.join(", ")}` : ""}${recentLimitReached ? " (the recent-results limit was reached)" : ""}.`
        : data.data.failedTypes.length
          ? `${repository.fullName}: GitHub could not complete all checks. Retry before drawing a conclusion.`
          : `${repository.fullName}: no matching activity in the available recent results${recentLimitReached ? " (the recent-results limit was reached)" : ""}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn't verify contribution activity.");
    } finally {
      setActiveProjectId("");
    }
  };

  const searchRepositories = async (event) => {
    event.preventDefault();
    setRepositoryQuery(repositorySearch.trim());
    setRepositoryPagination((current) => ({ ...current, page: 1 }));
    try {
      await loadRepositories({ page: 1, q: repositorySearch.trim() });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn't search discovered repositories.");
    }
  };

  const filterRepositories = async (filter) => {
    setRepositoryFilter(filter);
    setRepositoryPagination((current) => ({ ...current, page: 1 }));
    try {
      await loadRepositories({ page: 1, filter });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn't filter discovered repositories.");
    }
  };

  const changeRepositoryPage = async (page) => {
    try {
      await loadRepositories({ page });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Couldn't load this repository page.");
    }
  };

  const copyProfileLink = async () => {
    const url = `${window.location.origin}/u/${encodeURIComponent(profile.username)}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Public profile link copied.");
    } catch {
      setError(`Copy this profile link: ${url}`);
    }
  };

  if (loading) {
    return <main className={`evidence-profile-theme min-h-screen px-5 py-12 ${isDark ? "is-dark" : "bg-slate-50 text-slate-900"}`}><p role="status" className="mx-auto max-w-5xl">Loading your evidence profile…</p></main>;
  }

  return (
    <main className={`evidence-profile-theme min-h-screen px-4 py-8 ${isDark ? "is-dark" : "bg-slate-50 text-slate-900"} sm:px-8`}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">← Dashboard</Link>
            <h1 className="mt-3 text-3xl font-bold">Evidence profile</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Manage what visitors can see. GitHub activity is attributed only when GitHub’s account ID matches a connected DevCollab account.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyProfileLink} disabled={profile.profileVisibility !== "public" || !profile.username} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Copy public link</button>
          </div>
        </header>

        {error && <p role="alert" className="mb-5 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-800">{error}</p>}
        {message && <p role="status" className="mb-5 rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800">{message}</p>}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-xl font-bold">Developer details</h2><p className="mt-1 text-sm text-slate-500">Your profile is private until you choose to publish it.</p></div>
            <div className="text-sm text-slate-600">GitHub {profile.githubConnected ? `connected as @${profile.githubUsername}` : "not connected"}</div>
          </div>
          {!profile.githubConnected && <div className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900"><p>Connect through GitHub OAuth using an account with a verified email matching {profile.email || "your DevCollab account"}.</p><p className="mt-1">If the emails do not match, the existing OAuth flow may sign you into or create a different DevCollab account.</p><a href={`${API_ROOT}/auth/github`} className="mt-3 inline-block font-semibold underline">Continue with GitHub</a></div>}
          <form onSubmit={saveProfile} className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">Display name<input required maxLength={80} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <label className="text-sm font-medium">Profile visibility<select value={profile.profileVisibility} onChange={(event) => setProfile({ ...profile, profileVisibility: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="private">Private</option><option value="public">Public</option></select></label>
            <label className="text-sm font-medium sm:col-span-2">Short bio <span className="font-normal text-slate-500">(up to 280 characters)</span><textarea maxLength={280} rows={3} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <label className="text-sm font-medium sm:col-span-2">Avatar image URL<input type="url" value={profile.avatar} onChange={(event) => setProfile({ ...profile, avatar: event.target.value })} placeholder="https://..." className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <label className="text-sm font-medium sm:col-span-2">Technologies / skills <span className="font-normal text-slate-500">(comma-separated, up to 20)</span><input value={profile.technologies} onChange={(event) => setProfile({ ...profile, technologies: event.target.value })} placeholder="React, Node.js, MongoDB" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save profile"}</button>
              {profile.username && profile.profileVisibility === "public" && <Link to={`/u/${encodeURIComponent(profile.username)}`} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold">Preview public profile</Link>}
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Discovered public repositories</h2>
              <p className="mt-1 text-sm text-slate-600">
                DevCollab lists public repositories owned by {profile.githubUsername ? `@${profile.githubUsername}` : "your connected GitHub account"}.
                Private, collaborator, and organization-only repositories are not available with the current GitHub permissions.
              </p>
            </div>
            <button type="button" onClick={refreshRepositories} disabled={!profile.githubConnected || activeProjectId === "discovery" || repositorySync.status === "in_progress"} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {activeProjectId === "discovery" || repositorySync.status === "in_progress" ? "Refresh in progress…" : "Refresh repositories"}
            </button>
          </div>
          {repositorySync.message && <p className="mt-3 text-xs text-slate-500">{repositorySync.message}</p>}
          {repositorySync.truncated && <p className="mt-2 text-sm text-amber-800">The refresh reached the page limit. Use refresh later or narrow the results; additional repositories may not be listed.</p>}
          {!profile.githubConnected && <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Connect GitHub above to discover your public repositories.</p>}
          {profile.githubConnected && (
            <>
              <div className="mt-5 flex flex-wrap gap-3">
                <form onSubmit={searchRepositories} className="flex min-w-[16rem] flex-1 gap-2">
                  <input value={repositorySearch} onChange={(event) => setRepositorySearch(event.target.value)} maxLength={100} placeholder="Search repository names" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Search</button>
                </form>
                <select value={repositoryFilter} onChange={(event) => filterRepositories(event.target.value)} aria-label="Filter discovered repositories" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="all">All owned</option>
                  <option value="linked">Linked to projects</option>
                  <option value="unlinked">Not linked</option>
                  <option value="verified">Contribution verified</option>
                </select>
              </div>
              <p className="mt-3 text-xs text-slate-500">{repositoryPagination.total} public owned {repositoryPagination.total === 1 ? "repository" : "repositories"} found. Ownership is not proof of contribution.</p>
              {repositories.length === 0
                ? <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">{repositorySync.status === "in_progress" ? "Discovering repositories…" : "No repositories match these results. Refresh to check GitHub again."}</p>
                : <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 px-4">
                  {repositories.map((repository) => {
                    const busy = activeProjectId === repository.id;
                    return (
                      <li key={repository.id} className="py-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <a href={repository.url} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 hover:underline">{repository.fullName}</a>
                            <p className="mt-1 text-xs text-slate-500">
                              Public · owned by @{repository.ownerLogin}
                              {repository.primaryLanguage ? ` · ${repository.primaryLanguage}` : ""}
                              {repository.archived ? " · archived" : ""}
                              {repository.fork ? " · fork" : ""}
                            </p>
                            {repository.description && <p className="mt-2 text-sm text-slate-700">{repository.description}</p>}
                            <p className="mt-2 text-xs text-slate-600">
                              {repository.contributionStatus === "verified"
                                ? `Contribution verified${repository.contributionTypes.length ? ` (${repository.contributionTypes.join(", ")})` : ""}`
                                : repository.contributionStatus === "no_match"
                                  ? "No matching activity in available recent results"
                                  : repository.contributionStatus === "failed"
                                    ? "Contribution check failed; retry the check"
                                    : "Contribution not checked"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              aria-label={`Link ${repository.fullName} to a project`}
                              value={repository.linkedProject?.id || ""}
                              disabled={busy || !projects.length}
                              onChange={(event) => linkDiscoveredRepository(repository, event.target.value)}
                              className="max-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                            >
                              <option value="">Not linked to a project</option>
                              {projects.map((project) => (
                                <option
                                  key={project.id}
                                  value={project.id}
                                  disabled={Boolean(project.githubRepository?.id && project.githubRepository.id !== repository.githubRepositoryId)}
                                >
                                  {project.title}
                                </option>
                              ))}
                            </select>
                            <button type="button" disabled={busy} onClick={() => verifyRepository(repository)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-60">
                              {busy ? "Checking…" : "Check contribution"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>}
              <div className="mt-4 flex items-center justify-between">
                <button type="button" disabled={repositoryPagination.page <= 1} onClick={() => changeRepositoryPage(repositoryPagination.page - 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Previous</button>
                <span className="text-sm text-slate-500">Page {repositoryPagination.page}</span>
                <button type="button" disabled={!repositoryPagination.hasMore} onClick={() => changeRepositoryPage(repositoryPagination.page + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Next</button>
              </div>
            </>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-4"><h2 className="text-xl font-bold">Projects</h2><p className="mt-1 text-sm text-slate-600">Choose a discovered repository above to link it with a project.</p></div>
          {projects.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Create a project in your dashboard to add project evidence.</p> : (
            <div className="space-y-4">
              {projects.map((project) => {
                const busy = activeProjectId === project.id;
                return (
                  <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div><h3 className="font-semibold">{project.title}</h3><p className="mt-1 text-sm text-slate-500">{project.githubRepository?.fullName || "No GitHub repository linked"}</p></div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={project.visibility === "public"} disabled={busy} onChange={(event) => updateProject(project, { visibility: event.target.checked ? "public" : "private" })} />Public project</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(project.featured)} disabled={busy} onChange={(event) => updateProject(project, { featured: event.target.checked })} />Featured</label>
                      </div>
                    </div>
                    {project.githubRepository ? (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <a href={project.githubRepository.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-indigo-600 hover:underline">Open repository on GitHub</a>
                        <button type="button" disabled={busy} onClick={() => synchronize(project.id)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Working…" : "Sync evidence"}</button>
                        <button type="button" disabled={busy} onClick={() => unlinkRepository(project.id)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-60">Unlink repository</button>
                        {project.githubSync?.lastSyncedAt && <span className="text-xs text-slate-500">Last sync: {new Date(project.githubSync.lastSyncedAt).toLocaleString()} ({project.githubSync.status})</span>}
                      </div>
                    ) : <p className="mt-4 text-sm text-slate-500">No repository linked. Select one from the discovered repositories above.</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold">GitHub-attributed evidence</h2>
          {evidence.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No synchronized evidence yet. Link a public repository and run a sync. GitHub account matching is based on stable account IDs, not commit display names or email addresses.</p> : (
            <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">
              {evidence.map((item, index) => <li key={`${item.type}-${item.url}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.projectTitle} · {item.type === "pull_request" ? "Pull request" : "Commit"} · {item.status} · {new Date(item.occurredAt).toLocaleDateString()}</p></div><a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-indigo-600 hover:underline">View GitHub record</a></li>)}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">This evidence shows GitHub-attributed activity only; it is not an assessment of skill level or code quality. Pull-request reviews are not currently synchronized.</p>
        </section>
      </div>
    </main>
  );
}

export default ProfileSettings;
