import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      await signInWithEmailAndPassword(auth, email, password);
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
          SkillBarter
        </Link>

        <h2>Welcome back</h2>
        <p className="auth-subtitle-modern">
          Continue your interview practice.
        </p>

        <form onSubmit={handleSubmit} className="auth-form-modern">

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className={`input-modern ${errors.email ? 'input-error' : ''}`}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <span className="error-text" style={{ color: 'red', fontSize: '0.875rem' }}>{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className={`input-modern ${errors.password ? 'input-error' : ''}`}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <span className="error-text" style={{ color: 'red', fontSize: '0.875rem' }}>{errors.password}</span>}
          </div>

          {authError && (
            <div className="error-text" style={{ color: "red", fontSize: "0.875rem" }}>
              {authError}
            </div>
          )}

          <button type="submit" className="btn-primary-modern w-full-modern" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
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
