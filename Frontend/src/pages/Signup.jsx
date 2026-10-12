import axios from "axios";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Signup = () => {
  const [error, seterror] = useState("")
  const [pass, setpass] = useState("");
  const [email, setemail] = useState("");
  const [name, setname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const handleGithubSignup = () => {
    window.location.assign(`${apiUrl}/api/auth/github`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    seterror("");
    if (!name || !pass || !email) {
      seterror("Complete all fields to create your account.");
      return;
    }
    setIsLoading(true);
    try {
      await axios.post(`${apiUrl}/api/auth/signup`, { name, email, password: pass }, { withCredentials: true });
      console.log("signup successfull");
      navigate("/login");
    } catch (requestError) {
      seterror(requestError.response?.data?.message || "We could not create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (

    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.28),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.20),_transparent_30%)]" />
      <div className="absolute -top-24 right-10 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium tracking-[0.2em] text-indigo-300 uppercase shadow-lg shadow-indigo-900/30">
            devCollab
          </div>
          <h1 className="mt-5 text-3xl font-bold text-white tracking-tight">
            Create your account
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Collaborate. Build. Ship.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-[0_25px_80px_rgba(15,23,42,0.8)] p-8 backdrop-blur-xl transform transition duration-500 hover:-translate-y-0.5">
          <button
            type="button"
            onClick={handleGithubSignup}
            className="group mb-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm font-medium text-slate-100 transition-all duration-200 hover:border-indigo-400 hover:bg-slate-800 hover:shadow-lg hover:shadow-indigo-500/10"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current text-white transition-transform duration-200 group-hover:scale-110">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.9.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.26-1.28-5.26-5.72 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.09 0 4.45-2.7 5.42-5.28 5.7.41.35.78 1.04.78 2.1 0 1.51-.01 2.73-.01 3.1 0 .31.21.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
            Continue with GitHub
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-slate-500">
              <span className="bg-slate-900/80 px-3">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="mb-2">
              <h2 className="text-2xl font-semibold text-white">
                Join devCollab
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Create your account and start building together.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-name" className="block text-sm font-medium text-slate-200">Your name</label>
              <input id="signup-name" type="text" placeholder="Alex Morgan" value={name} onChange={(e) => setname(e.target.value)} autoComplete="name" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-email" className="block text-sm font-medium text-slate-200">Email address</label>
              <input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setemail(e.target.value)} autoComplete="email" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="signup-password" className="text-sm font-medium text-slate-200">Password</label>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">{showPassword ? "Hide" : "Show"}</button>
              </div>
              <input id="signup-password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" value={pass} onChange={(e) => setpass(e.target.value)} autoComplete="new-password" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}

            <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-[1.01] hover:shadow-xl hover:shadow-indigo-500/20 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50">
              {isLoading ? "Creating your account..." : "Create account"}
            </button>

            <p className="text-center text-sm text-slate-400 pt-1">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Log in</Link>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">© 2026 devCollab. All rights reserved.</p>
      </div>
    </main>


  )
}

export default Signup