import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setResetUrl("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Email is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await requestPasswordReset({ email: normalizedEmail });
      setMessage(response?.message || "Check your email for a reset link.");
      setResetUrl(response?.resetUrl || "");
    } catch (err) {
      setError(err?.message || "Unable to start password reset.");
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

        <h2>Reset your password</h2>
        <p className="auth-subtitle-modern">
          Enter your email and we&apos;ll generate a password reset link.
        </p>

        <form onSubmit={handleSubmit} className="auth-form-modern">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className={`input-modern ${error ? "input-error" : ""}`}
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {error ? <div className="error-text">{error}</div> : null}
          {message ? <div className="success-text">{message}</div> : null}
          {resetUrl ? (
            <div className="helper-text">
              Local reset link:{" "}
              <a href={resetUrl} className="auth-link-modern">
                Open reset page
              </a>
            </div>
          ) : null}

          <button type="submit" className="btn-primary-modern w-full-modern" disabled={isSubmitting}>
            {isSubmitting ? "Generating..." : "Send reset link"}
          </button>
        </form>

        <p className="auth-footer-modern">
          Remembered your password?{" "}
          <Link to="/login" className="auth-link-modern">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
