function DashboardSidebar({
  activeTab,
  isDark,
  muted,
  sidebarCollapsed,
  mobileNavOpen,
  navItems,
  user,
  onSelectTab,
  onOpenProfile,
  initials,
}) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r px-4 py-6 transition-all duration-200 md:sticky md:top-0 md:z-10 md:h-screen md:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "md:w-[5.5rem]" : "md:w-72"} ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}
    >
      <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3 px-2"} pb-8`}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-600/20">D</div>
        {!sidebarCollapsed && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">Dev</p>
            <h1 className="text-lg font-bold">Collab</h1>
          </div>
        )}
      </div>

      <nav aria-label="Dashboard navigation" className="space-y-2">
        {navItems.map(({ label, icon }) => (
          <button
            type="button"
            key={label}
            onClick={() => onSelectTab(label)}
            title={sidebarCollapsed ? label : undefined}
            aria-current={activeTab === label ? "page" : undefined}
            className={`flex w-full items-center rounded-xl py-2.5 text-sm font-medium transition ${sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3 text-left"} ${activeTab === label ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25" : isDark ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base font-semibold">{icon}</span>
            {!sidebarCollapsed && label}
          </button>
        ))}
      </nav>

      <button
        type="button"
        onClick={onOpenProfile}
        title={sidebarCollapsed ? "Open profile" : undefined}
        className={`mt-auto flex items-center rounded-xl border p-2 transition ${sidebarCollapsed ? "justify-center" : "gap-3"} ${isDark ? "border-slate-800 bg-slate-950 hover:bg-slate-800" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
            {initials(user?.name)}
          </span>
        )}
        {!sidebarCollapsed && (
          <span className="min-w-0 text-left">
            <span className="block truncate text-sm font-semibold">{user?.name || "Your profile"}</span>
            <span className={`block truncate text-xs ${muted}`}>View profile</span>
          </span>
        )}
      </button>
    </aside>
  );
}

export default DashboardSidebar;
