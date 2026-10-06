import { useState } from "react"
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [email, setemail] = useState("")
  const [pass, setpass] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!pass || !email) {
      setError("Enter your email and password to continue.");
      return;
    }
    setIsLoading(true);
    try {
      await axios.post("http://localhost:3000/api/auth/login", { email, password: pass }, { withCredentials: true });
      console.log("login successfull");
      navigate("/");

    } catch (requestError) {
      setError(requestError.response?.data?.message || "We could not sign you in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }


  return (

    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            dev<span className="text-indigo-500">Collab</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Collaborate. Build. Ship.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Heading */}
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Log in to your space
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Welcome back! Enter your details to continue.
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-200"
              >
                Email address
              </label>

              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setemail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3
                       text-white placeholder-slate-500 outline-none
                       transition focus:border-indigo-500 focus:ring-2
                       focus:ring-indigo-500/20"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-slate-200"
                >
                  Password
                </label>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300
                         transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={pass}
                onChange={(e) => setpass(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3
                       text-white placeholder-slate-500 outline-none
                       transition focus:border-indigo-500 focus:ring-2
                       focus:ring-indigo-500/20"
              />
            </div>

            {/* Error */}
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10
                       px-4 py-3 text-sm text-red-400"
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3
                     text-sm font-semibold text-white
                     transition-all duration-200
                     hover:bg-indigo-500
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                     disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Signing you in..." : "Continue"}
            </button>

            {/* Signup */}
            <p className="text-center text-sm text-slate-400">
              New to devCollab?{" "}
              <Link
                to="/signup"
                className="font-medium text-indigo-400 hover:text-indigo-300
                       transition-colors"
              >
                Create an account
              </Link>
            </p>

          </form>
        </div>

        {/* Footer */}=
        <p className="text-center text-xs text-slate-600 mt-6">
          © 2026 devCollab. All rights reserved.
        </p>

      </div>
    </main>

  )
}

export default Login