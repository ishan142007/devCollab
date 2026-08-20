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
      await axios.post("http://localhost:3000/api/signup", { name, email, password: pass }, { withCredentials: true });
      console.log("signup successfull");
      navigate("/login");
    } catch (requestError) {
      seterror(requestError.response?.data?.message || "We could not create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />
      <section className="auth-layout auth-layout-signup">
        <div className="auth-intro">
          <div className="brand-mark">dc<span>.</span></div>
          <p className="eyebrow">Make room for momentum</p>
          <h1>There is more to make when you <em>make it together.</em></h1>
          <p className="intro-copy">A home for the projects that matter, the people who move them forward, and the ideas in between.</p>
          <div className="intro-note"><span className="note-dot" /> Free to start. Built to grow.</div>
        </div>
        <div className="auth-card-wrap">
          <form className="auth-card" onSubmit={handleSubmit}>
            <div className="card-heading"><p className="eyebrow">Start fresh</p><h2>Create your account</h2><p>It only takes a minute to get moving.</p></div>
            <div className="field-group"><label htmlFor="signup-name">Your name</label><input id="signup-name" type="text" placeholder="Alex Morgan" value={name} onChange={(e) => setname(e.target.value)} autoComplete="name" /></div>
            <div className="field-group"><label htmlFor="signup-email">Email address</label><input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setemail(e.target.value)} autoComplete="email" /></div>
            <div className="field-group"><div className="field-label-row"><label htmlFor="signup-password">Password</label><button type="button" className="text-button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div><input id="signup-password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" value={pass} onChange={(e) => setpass(e.target.value)} autoComplete="new-password" /></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="submit-button" type="submit" disabled={isLoading}>{isLoading ? "Creating your account..." : "Create account"}<span aria-hidden="true">-&gt;</span></button>
            <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
          </form>
        </div>
      </section>
    </main>
  )
}

export default Signup