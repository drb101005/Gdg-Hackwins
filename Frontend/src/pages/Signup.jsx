import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../services/api";
import { setStoredAuth } from "../services/auth";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const nextErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).+$/;

    if (!name.trim()) {
      nextErrors.name = "Full name is required";
    } else if (name.trim().length < 3) {
      nextErrors.name = "Name must be at least 3 characters long";
    }

    if (!email) {
      nextErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      nextErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      nextErrors.password = "Password is required";
    } else if (!passwordRegex.test(password)) {
      nextErrors.password = "Password must contain at least one uppercase letter and one digit";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters long";
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
      const session = await signup({ name, email, password });
      setStoredAuth(session);
      navigate("/home");
    } catch (err) {
      setAuthError(err?.message || "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-modern">
      <div className="auth-card-modern">
        <Link to="/" className="auth-logo-modern">
          SkillBarter
        </Link>

        <h2>Create account</h2>
        <p className="auth-subtitle-modern">Start building your interview confidence.</p>

        <form onSubmit={handleSubmit} className="auth-form-modern">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className={`input-modern ${errors.name ? "input-error" : ""}`}
              placeholder="Enter your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {errors.name ? <span className="error-text">{errors.name}</span> : null}
          </div>

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
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {errors.password ? <span className="error-text">{errors.password}</span> : null}
          </div>

          {authError ? <span className="error-text">{authError}</span> : null}

          <button type="submit" className="btn-primary-modern w-full-modern" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Account"}
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
