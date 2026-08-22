import { useState } from "react"
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [email, setemail] = useState("")
  const [pass, setpass] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate=useNavigate();

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
    <main className="auth-page">
      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />
      <section className="auth-layout">
        <div className="auth-intro">
          <div className="brand-mark">DC<span>.</span></div>
          <p className="eyebrow">A better way to build together</p>
          <h1>Good work starts with the right <em>people.</em></h1>
          <p className="intro-copy">Bring your ideas, projects, and favorite collaborators into one calm, focused workspace.</p>
          <div className="intro-note"><span className="note-dot" /> Your next great project is waiting.</div>
        </div>
        <div className="auth-card-wrap">
          <form className="auth-card" onSubmit={handleSubmit}>
            <div className="card-heading"><p className="eyebrow">Welcome back</p><h2>Log in to your space</h2><p>Pick up right where you left off.</p></div>
            <div className="field-group"><label htmlFor="login-email">Email address</label><input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setemail(e.target.value)} autoComplete="email" /></div>
            <div className="field-group"><div className="field-label-row"><label htmlFor="login-password">Password</label><button type="button" className="text-button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div><input id="login-password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={pass} onChange={(e) => setpass(e.target.value)} autoComplete="current-password" /></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="submit-button" type="submit" disabled={isLoading}>{isLoading ? "Signing you in..." : "Continue"}<span aria-hidden="true">-&gt;</span></button>
            <p className="auth-switch">New to devCollab? <Link to="/signup">Create an account</Link></p>
          </form>
        </div>
      </section>
    </main>
  )
}

export default Login