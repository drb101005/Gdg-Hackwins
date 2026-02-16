import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = "Full Name is required";
    } else if (name.length < 3) {
      newErrors.name = "Name must be at least 3 characters long";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).+$/;
    if (!password) {
      newErrors.password = "Password is required";
    } else if (!passwordRegex.test(password)) {
      newErrors.password = "Password must contain at least one uppercase letter and one digit";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Simulate signup success
      setShowSuccess(true);
      // In a real app, you would verify uniqueness here against the backend
    }
  };

  return (
    <div className="auth-modern">

      <div className="auth-card-modern">

        <Link to="/" className="auth-logo-modern">
          SkillBarter
        </Link>

        <h2>Create account</h2>
        <p className="auth-subtitle-modern">
          Start building your interview confidence.
        </p>

        {showSuccess ? (
          <div className="text-secondary-modern text-center">
            <h3>Signup Successful!</h3>
            <p className="mt-4">
              <Link to="/login" className="btn-primary-modern w-full-modern block text-center no-underline">
                Login here
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form-modern">

            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className={`input-modern ${errors.name ? 'input-error' : ''}`}
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && <span className="error-text" style={{color: 'red', fontSize: '0.875rem'}}>{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className={`input-modern ${errors.email ? 'input-error' : ''}`}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && <span className="error-text" style={{color: 'red', fontSize: '0.875rem'}}>{errors.email}</span>}
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className={`input-modern ${errors.password ? 'input-error' : ''}`}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password && <span className="error-text" style={{color: 'red', fontSize: '0.875rem'}}>{errors.password}</span>}
            </div>

            <button type="submit" className="btn-primary-modern w-full-modern">
              Create Account
            </button>

          </form>
        )}

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
