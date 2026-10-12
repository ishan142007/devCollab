import axios from "axios";
import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "../components/DashboardSidebar";
import AuthContext from "../context/AuthContext";

const API_URL = "http://localhost:3000/api/project";
const EMPTY_FORM = { title: "", description: "", status: "Active", technologies: "", visibility: "private", featured: false };
const STATUSES = ["Active", "Completed", "Archived"];
const NAV_ITEMS = [
  { label: "Overview", icon: "⌂" },
  { label: "Projects", icon: "▣" },
  { label: "Tasks", icon: "✓" },
  { label: "Reports", icon: "◫" },
  { label: "Settings", icon: "⚙" },
];
const PROFILE_API_URL = "http://localhost:3000/api/auth/me";
const emptyProfileForm = (user) => ({ name: user?.name ?? "", email: user?.email ?? "", avatar: user?.avatar ?? "" });

function Dashboard() {
  const navigate = useNavigate();
  const { User, updateUser, logout } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("dashboard-theme") || "light");
  const [activeTab, setActiveTab] = useState("Overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("dashboard-sidebar-collapsed") === "true");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState("");
  const [profileForm, setProfileForm] = useState(() => emptyProfileForm(User));
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const taskRequestRef = useRef(0);
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

  useEffect(() => {
    localStorage.setItem("dashboard-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const loadWorkspaceTasks = async () => {
    const requestId = ++taskRequestRef.current;
    setTasksLoading(true);
    setTasksError("");
    try {
      const projectTasks = await Promise.all(projects.map(async (project) => {
        const { data } = await axios.get(`${API_URL}/${project._id}/task`, { withCredentials: true });
        return (data.tasks ?? []).map((task) => ({ ...task, projectId: project._id, projectTitle: project.title }));
      }));
      if (taskRequestRef.current === requestId) setTasks(projectTasks.flat());
    } catch (err) {
      if (taskRequestRef.current === requestId) {
        setTasksError(err.response?.data?.message || "Couldn't load workspace tasks.");
      }
    } finally {
      if (taskRequestRef.current === requestId) setTasksLoading(false);
    }
  };

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
    setForm({
      title: project.title ?? "",
      description: project.description ?? "",
      status: project.status ?? "Active",
      technologies: (project.technologies ?? []).join(", "),
      visibility: project.visibility ?? "private",
      featured: Boolean(project.featured)
    });
    setEditProject(project);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const { data } = await axios.patch(PROFILE_API_URL, {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        avatar: profileForm.avatar.trim()
      }, { withCredentials: true });
      updateUser(data.data);
      setEditingProfile(false);
      setProfileMessage("Your profile has been updated.");
    } catch (err) {
      setProfileError(err.response?.data?.message || "Couldn't update your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setLogoutError(err.response?.data?.message || "Couldn't log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const selectTab = (tab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
    setError("");
    if (tab === "Tasks" || tab === "Reports") loadWorkspaceTasks();
    if (tab === "Profile") {
      setProfileMessage("");
      setProfileError("");
    }
  };

  const initials = (name) => (name || "User").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  const projectStats = {
    active: projects.filter((project) => (project.status || "Active") === "Active").length,
    completed: projects.filter((project) => project.status === "Completed").length,
    archived: projects.filter((project) => project.status === "Archived").length
  };
  const taskStats = {
    total: tasks.length,
    active: tasks.filter((task) => task.status === "Active").length,
    pending: tasks.filter((task) => task.status === "Pending").length,
    completed: tasks.filter((task) => task.status === "Completed").length
  };

  const saveProject = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        technologies: form.technologies.split(",").map((tag) => tag.trim()).filter(Boolean)
      };
      if (editProject) {
        const { data } = await axios.patch(`${API_URL}/${editProject._id}`, payload, { withCredentials: true });
        const updated = data.updatedProject;
        setProjects((current) => current.map((project) => project._id === updated._id ? updated : project));
      } else {
        const { data } = await axios.post(API_URL, payload, { withCredentials: true });
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
      {mobileNavOpen && <button aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-slate-950/50 md:hidden" />}
      <div className="flex min-h-screen">
        <DashboardSidebar
          activeTab={activeTab}
          isDark={isDark}
          muted={muted}
          sidebarCollapsed={sidebarCollapsed}
          mobileNavOpen={mobileNavOpen}
          navItems={NAV_ITEMS}
          user={User}
          onSelectTab={selectTab}
          onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
          onCloseMobileNav={() => setMobileNavOpen(false)}
          onOpenProfile={() => selectTab("Profile")}
          initials={initials}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className={`sticky top-0 z-20 border-b ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" className={`flex h-10 w-10 items-center justify-center rounded-xl border md:hidden ${isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-100"}`}><span aria-hidden="true">☰</span></button>
                <button type="button" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} className={`hidden h-10 w-10 items-center justify-center rounded-xl border md:flex ${isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-100"}`}><span aria-hidden="true">{sidebarCollapsed ? "»" : "«"}</span></button>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Workspace</p><h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{activeTab}</h1></div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                {["Overview", "Projects"].includes(activeTab) && <button onClick={openCreate} className="rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:px-4"><span aria-hidden="true" className="mr-1 sm:mr-2">＋</span><span className="hidden sm:inline">New project</span><span className="sm:hidden">New</span></button>}
              </div>
            </div>
          </header>

          <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-8 sm:py-10">
            {error && !dialogOpen && <p role="alert" className="mb-5 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-800">{error}</p>}

            {activeTab === "Overview" && (
              <div className="mb-8 grid gap-4 sm:grid-cols-3">
                {[["Total projects", projects.length, "▣"], ["Active", projectStats.active, "◷"], ["Completed", projectStats.completed, "✓"]].map(([label, value, icon]) => (
                  <article key={label} className={`rounded-2xl border p-5 ${panel}`}><div className="flex items-center justify-between"><p className={`text-sm font-medium ${muted}`}>{label}</p><span className="text-xl text-indigo-500" aria-hidden="true">{icon}</span></div><p className="mt-3 text-3xl font-bold">{value}</p></article>
                ))}
              </div>
            )}

            {["Overview", "Projects"].includes(activeTab) && (
              <>
                <div className="mb-6 flex items-end justify-between gap-3">
                  <div><h2 className="text-lg font-semibold">{activeTab === "Overview" ? "Recent projects" : "All projects"}</h2><p className={`mt-1 text-sm ${muted}`}>Keep track of work and project status.</p></div>
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"}`}>{projects.length} {projects.length === 1 ? "project" : "projects"}</span>
                </div>
                {projects.length === 0 ? (
                  <div className={`rounded-2xl border border-dashed px-6 py-16 text-center ${panel}`}><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-2xl text-indigo-700" aria-hidden="true">✦</div><h3 className="mt-4 text-lg font-semibold">No projects yet</h3><p className={`mx-auto mt-2 max-w-sm text-sm ${muted}`}>Create your first project to organize work and follow its progress.</p><button onClick={openCreate} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Create a project</button></div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                      <article key={project._id} role="link" tabIndex={0} onClick={() => navigate(`/projects/${project._id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(`/projects/${project._id}`); } }} className={`group flex min-h-[250px] cursor-pointer flex-col rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/30 ${panel}`}>
                        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-bold">{project.title}</h3><span className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${project.status === "Completed" ? (isDark ? "bg-blue-950 text-blue-300" : "bg-blue-50 text-blue-700") : project.status === "Archived" ? (isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600") : (isDark ? "bg-emerald-950 text-emerald-300" : "bg-emerald-50 text-emerald-700")}`}><span className={`h-1.5 w-1.5 rounded-full ${project.status === "Completed" ? "bg-blue-500" : project.status === "Archived" ? "bg-slate-400" : "bg-emerald-500"}`} />{project.status || "Active"}</span></div><div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">◈</div></div>
                        <p className={`mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 ${muted}`}>{project.description || "No description added yet."}</p>
                        <div className={`mt-auto flex items-center justify-between border-t pt-4 ${isDark ? "border-slate-800" : "border-slate-100"}`}><span className={`text-xs ${muted}`}>Open workspace</span><div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"><button type="button" onClick={(event) => { event.stopPropagation(); openEdit(project); }} className={`rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 transition ${isDark ? "hover:bg-slate-800" : "hover:bg-indigo-50"}`}>Edit</button><button type="button" onClick={(event) => { event.stopPropagation(); setError(""); setDeleteProject(project); }} aria-label={`Delete ${project.title}`} className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">Delete</button></div></div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "Tasks" && (
              <div><div className="mb-6"><h2 className="text-lg font-semibold">Tasks across your projects</h2><p className={`mt-1 text-sm ${muted}`}>Select a task to open its project workspace.</p></div>
                {tasksLoading ? <p role="status" className={muted}>Loading tasks…</p> : tasksError ? <p role="alert" className="rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-800">{tasksError}</p> : tasks.length === 0 ? <div className={`rounded-2xl border p-8 text-center ${panel}`}><p className="font-semibold">No tasks yet</p><p className={`mt-2 text-sm ${muted}`}>Tasks created inside your project workspaces will appear here.</p></div> : <div className={`overflow-hidden rounded-2xl border ${panel}`}><ul className="divide-y divide-slate-200 dark:divide-slate-800">{tasks.map((task) => <li key={task._id}><button type="button" onClick={() => navigate(`/projects/${task.projectId}`)} className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-50"}`}><span className="min-w-0"><span className="block truncate font-semibold">{task.name}</span><span className={`mt-1 block truncate text-sm ${muted}`}>{task.projectTitle}</span></span><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${task.status === "Completed" ? "bg-emerald-100 text-emerald-700" : task.status === "Pending" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>{task.status}</span></button></li>)}</ul></div>}
              </div>
            )}

            {activeTab === "Reports" && (
              <div><div className="mb-6"><h2 className="text-lg font-semibold">Workspace report</h2><p className={`mt-1 text-sm ${muted}`}>A live summary based on your current project and task data.</p></div>
                {tasksLoading ? <p role="status" className={muted}>Loading report…</p> : tasksError ? <p role="alert" className="rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-800">{tasksError}</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[["Projects", projects.length], ["Active projects", projectStats.active], ["Completed projects", projectStats.completed], ["Tasks", taskStats.total], ["Active tasks", taskStats.active], ["Pending tasks", taskStats.pending], ["Completed tasks", taskStats.completed]].map(([label, value]) => <article key={label} className={`rounded-2xl border p-5 ${panel}`}><p className={`text-sm font-medium ${muted}`}>{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></article>)}</div>}
              </div>
            )}

            {activeTab === "Profile" && (
              <div className="mx-auto max-w-3xl"><div className="mb-6"><h2 className="text-lg font-semibold">Your profile</h2><p className={`mt-1 text-sm ${muted}`}>Manage the personal details shown in your workspace.</p></div>
                <div className={`rounded-2xl border p-6 sm:p-8 ${panel}`}>
                  <div className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
                    <div className="flex items-center gap-4">{User?.avatar ? <img src={User.avatar} alt={`${User?.name || "User"} avatar`} className="h-20 w-20 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-700">{initials(User?.name)}</div>}<div><h3 className="text-xl font-bold">{User?.name || "Your name"}</h3><p className={`mt-1 ${muted}`}>{User?.email}</p></div></div>
                    <div className="flex flex-wrap gap-2">
                      {!editingProfile && <button type="button" onClick={() => { setProfileForm(emptyProfileForm(User)); setProfileError(""); setProfileMessage(""); setEditingProfile(true); }} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold ${isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}>Edit profile</button>}
                      <button type="button" onClick={handleLogout} disabled={loggingOut} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${isDark ? "border-rose-900 text-rose-300 hover:bg-rose-950" : "border-rose-300 text-rose-700 hover:bg-rose-50"}`}>
                        {loggingOut ? "Logging out…" : "Log out"}
                      </button>
                    </div>
                  </div>
                  {logoutError && <p role="alert" className="mt-5 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-800">{logoutError}</p>}
                  {profileMessage && <p role="status" className="mt-5 rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800">{profileMessage}</p>}
                  {editingProfile && <form onSubmit={saveProfile} className="mt-6 space-y-5">
                    <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>Full name<input required maxLength={80} value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} autoComplete="name" className={`mt-2 w-full rounded-lg border px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 ${isDark ? "border-slate-700 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-900"}`} /></label>
                    <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>Email address<input required type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} autoComplete="email" className={`mt-2 w-full rounded-lg border px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 ${isDark ? "border-slate-700 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-900"}`} /></label>
                    <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>Avatar image URL <span className={`font-normal ${muted}`}>(optional)</span><input type="url" value={profileForm.avatar} onChange={(event) => setProfileForm((current) => ({ ...current, avatar: event.target.value }))} placeholder="https://example.com/avatar.jpg" className={`mt-2 w-full rounded-lg border px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 ${isDark ? "border-slate-700 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-900"}`} /></label>
                    {profileError && <p role="alert" className="rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-800">{profileError}</p>}
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={() => { setEditingProfile(false); setProfileForm(emptyProfileForm(User)); setProfileError(""); }} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold ${isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}>Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Save profile"}</button></div>
                  </form>}
                  {!editingProfile && <div className="mt-6"><p className={`text-sm ${muted}`}>{User?.bio || "Add a short developer bio, technology tags, and manage project evidence."}</p><button type="button" onClick={() => navigate("/profile")} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Manage evidence profile</button></div>}
                </div>
              </div>
            )}

            {activeTab === "Settings" && (
              <div className="mx-auto max-w-3xl"><div className="mb-6"><h2 className="text-lg font-semibold">Workspace settings</h2><p className={`mt-1 text-sm ${muted}`}>Customize the dashboard to suit your workflow.</p></div>
                <div className={`divide-y rounded-2xl border px-5 ${panel}`} style={{ borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
                  <div className="flex items-center justify-between gap-4 py-5"><div><p className="font-semibold">Color theme</p><p className={`mt-1 text-sm ${muted}`}>Choose light or dark appearance.</p></div><button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">{isDark ? "Switch to light" : "Switch to dark"}</button></div>
                  <div className="flex items-center justify-between gap-4 py-5"><div><p className="font-semibold">Sidebar width</p><p className={`mt-1 text-sm ${muted}`}>Keep the full navigation labels or collapse to icons.</p></div><button type="button" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold ${isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}>{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</button></div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

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
                <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>Technologies <span className={`font-normal ${muted}`}>(comma-separated)</span>
                 <input value={form.technologies} onChange={(e) => setForm({ ...form, technologies: e.target.value })} placeholder="React, Node.js, MongoDB" className={`mt-2 w-full rounded-lg border px-3 py-2.5 outline-none focus:border-indigo-500 ${isDark ? "border-slate-700 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-900"}`} />
                </label>
                <label className={`block text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>Project visibility
                 <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className={`mt-2 w-full rounded-lg border px-3 py-2.5 outline-none focus:border-indigo-500 ${isDark ? "border-slate-700 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-900"}`}>
                   <option value="private">Private</option><option value="public">Public</option>
                 </select>
                </label>
                <label className={`flex items-center gap-2 text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />Feature on my public profile</label>
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
