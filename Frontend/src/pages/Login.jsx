import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/home");
  };

  return (
    <div className="auth-modern">

      <div className="auth-card-modern">

        <Link to="/" className="auth-logo-modern">
          InterviewLab
        </Link>

        <h2>Welcome back</h2>
        <p className="auth-subtitle-modern">
          Continue your interview practice.
        </p>

        <form onSubmit={handleSubmit} className="auth-form-modern">

          <label>Email</label>
          <input
            type="email"
            className="input-modern"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            className="input-modern"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn-primary-modern w-full-modern">
            Sign In
          </button>

        </form>

        <p className="auth-footer-modern">
          Don’t have an account?{" "}
          <Link to="/signup" className="auth-link-modern">
            Create one
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Login;
