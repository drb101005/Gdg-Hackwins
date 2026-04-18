import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../services/api";
import { setStoredAuth } from "../services/auth";

const SECURITY_QUESTIONS = [
  "What is your favorite color?",
  "What is your favorite fruit?",
  "What is your favorite animal?",
  "What city were you born in?",
];

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
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

    if (!securityQuestion) {
      nextErrors.securityQuestion = "Security question is required";
    }

    if (!securityAnswer.trim()) {
      nextErrors.securityAnswer = "Security answer is required";
    } else if (!/^[a-zA-Z]+$/.test(securityAnswer.trim())) {
      nextErrors.securityAnswer = "Security answer must be a single word";
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
      const session = await signup({
        name,
        email,
        password,
        securityQuestion,
        securityAnswer: securityAnswer.trim().toLowerCase(),
      });
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

          <div className="form-group">
            <label>Security Question</label>
            <select
              className={`input-modern ${errors.securityQuestion ? "input-error" : ""}`}
              value={securityQuestion}
              onChange={(event) => setSecurityQuestion(event.target.value)}
            >
              {SECURITY_QUESTIONS.map((question) => (
                <option key={question} value={question}>
                  {question}
                </option>
              ))}
            </select>
            {errors.securityQuestion ? <span className="error-text">{errors.securityQuestion}</span> : null}
          </div>

          <div className="form-group">
            <label>Security Answer</label>
            <input
              type="text"
              className={`input-modern ${errors.securityAnswer ? "input-error" : ""}`}
              placeholder="Single word answer"
              value={securityAnswer}
              onChange={(event) => setSecurityAnswer(event.target.value)}
            />
            {errors.securityAnswer ? <span className="error-text">{errors.securityAnswer}</span> : null}
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
