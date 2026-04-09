import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../services/api";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("This reset link is missing a token.");
      return;
    }

    if (!password) {
      setError("New password is required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await resetPassword({ token, password });
      setMessage(response?.message || "Password reset successful.");
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      setError(err?.message || "Unable to reset password.");
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

        <h2>Create a new password</h2>
        <p className="auth-subtitle-modern">
          Choose a new password with at least one uppercase letter and one digit.
        </p>

        <form onSubmit={handleSubmit} className="auth-form-modern">
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              className={`input-modern ${error ? "input-error" : ""}`}
              placeholder="Enter a new password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              className={`input-modern ${error ? "input-error" : ""}`}
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {error ? <div className="error-text">{error}</div> : null}
          {message ? <div className="success-text">{message}</div> : null}

          <button type="submit" className="btn-primary-modern w-full-modern" disabled={isSubmitting}>
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <p className="auth-footer-modern">
          <Link to="/login" className="auth-link-modern">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
