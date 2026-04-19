import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/api";
import { setStoredAuth } from "../services/auth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const nextErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      nextErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      nextErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      nextErrors.password = "Password is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await login({ email, password });
      setStoredAuth(session);
      navigate("/home");
    } catch (err) {
      setAuthError(err?.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-modern">
      <div className="auth-card-modern">
        <Link to="/" className="auth-logo-modern">
          Skill Barter
        </Link>

        <h2>Welcome back</h2>
        <p className="auth-subtitle-modern">Continue your interview practice.</p>

        <form onSubmit={handleSubmit} className="auth-form-modern">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className={`input-modern ${errors.email ? "input-error" : ""}`}
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {errors.email ? <span className="error-text">{errors.email}</span> : null}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className={`input-modern ${errors.password ? "input-error" : ""}`}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {errors.password ? <span className="error-text">{errors.password}</span> : null}
          </div>

          <div className="auth-inline-actions">
            <Link to="/forgot-password" className="auth-link-modern">
              Forgot password?
            </Link>
          </div>

          {authError ? <div className="error-text">{authError}</div> : null}

          <button type="submit" className="btn-primary-modern w-full-modern" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="auth-footer-modern">
          Don't have an account?{" "}
          <Link to="/signup" className="auth-link-modern">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
