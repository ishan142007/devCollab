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
    <main>
      <form onSubmit={handleSubmit}>
        <h2>Log in to your space</h2>

        <div>
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setemail(e.target.value)} autoComplete="email" />
        </div>

        <div>
          <label htmlFor="login-password">Password</label>
          <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
          <input id="login-password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={pass} onChange={(e) => setpass(e.target.value)} autoComplete="current-password" />
        </div>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Signing you in..." : "Continue"}
        </button>

        <p>
          New to devCollab? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </main>
  )
}

export default Login