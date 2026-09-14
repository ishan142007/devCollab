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
    <main>
      <form onSubmit={handleSubmit}>
        <h2>Create your account</h2>

        <div>
          <label htmlFor="signup-name">Your name</label>
          <input id="signup-name" type="text" placeholder="Alex Morgan" value={name} onChange={(e) => setname(e.target.value)} autoComplete="name" />
        </div>

        <div>
          <label htmlFor="signup-email">Email address</label>
          <input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setemail(e.target.value)} autoComplete="email" />
        </div>

        <div>
          <label htmlFor="signup-password">Password</label>
          <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
          <input id="signup-password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" value={pass} onChange={(e) => setpass(e.target.value)} autoComplete="new-password" />
        </div>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Creating your account..." : "Create account"}
        </button>

        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </main>
  )
}

export default Signup