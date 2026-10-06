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

  const handleSubmit = async (e) => {
    e.preventDefault();
    seterror("");
    if (!name || !pass || !email) {
      seterror("Complete all fields to create your account.");
      return;
    }
    setIsLoading(true);
    try {
      await axios.post("http://localhost:3000/api/auth/signup", { name, email, password: pass }, { withCredentials: true });
      console.log("signup successfull");
      navigate("/login");
    } catch (requestError) {
      seterror(requestError.response?.data?.message || "We could not create your account. Please try again.");
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

        {/* Signup Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Heading */}
            <div className="mb-2">
              <h2 className="text-2xl font-semibold text-white">
                Create your account
              </h2>

              <p className="text-slate-400 text-sm mt-1">
                Join devCollab and start building together.
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label
                htmlFor="signup-name"
                className="block text-sm font-medium text-slate-200"
              >
                Your name
              </label>

              <input
                id="signup-name"
                type="text"
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setname(e.target.value)}
                autoComplete="name"
                className="w-full rounded-lg border border-slate-700
                       bg-slate-950 px-4 py-3
                       text-white placeholder-slate-500
                       outline-none transition
                       focus:border-indigo-500
                       focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="signup-email"
                className="block text-sm font-medium text-slate-200"
              >
                Email address
              </label>

              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setemail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-lg border border-slate-700
                       bg-slate-950 px-4 py-3
                       text-white placeholder-slate-500
                       outline-none transition
                       focus:border-indigo-500
                       focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="signup-password"
                  className="text-sm font-medium text-slate-200"
                >
                  Password
                </label>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-medium text-indigo-400
                         hover:text-indigo-300 transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={pass}
                onChange={(e) => setpass(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-700
                       bg-slate-950 px-4 py-3
                       text-white placeholder-slate-500
                       outline-none transition
                       focus:border-indigo-500
                       focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Error */}
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/30
                       bg-red-500/10 px-4 py-3
                       text-sm text-red-400"
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-indigo-600
                     px-4 py-3 text-sm font-semibold text-white
                     transition-all duration-200
                     hover:bg-indigo-500
                     focus:outline-none
                     focus:ring-2 focus:ring-indigo-500/50
                     disabled:cursor-not-allowed
                     disabled:opacity-50"
            >
              {isLoading
                ? "Creating your account..."
                : "Create account"}
            </button>

            {/* Login Link */}
            <p className="text-center text-sm text-slate-400 pt-1">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-indigo-400
                       hover:text-indigo-300
                       transition-colors"
              >
                Log in
              </Link>
            </p>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          © 2026 devCollab. All rights reserved.
        </p>

      </div>
    </main>


  )
}

export default Signup