import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Signup() {
  const [name, setName] = useState("");
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

        <h2>Create account</h2>
        <p className="auth-subtitle-modern">
          Start building your interview confidence.
        </p>

        <form onSubmit={handleSubmit} className="auth-form-modern">

          <label>Full Name</label>
          <input
            type="text"
            className="input-modern"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

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
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn-primary-modern w-full-modern">
            Create Account
          </button>

        </form>

        <p className="auth-footer-modern">
          Already have an account?{" "}
          <Link to="/login" className="auth-link-modern">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Signup;
