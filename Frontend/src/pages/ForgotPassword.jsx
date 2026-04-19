import React, { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { loginWithSecurityAnswer, requestPasswordReset } from "../services/api";
import { setStoredAuth } from "../services/auth";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Email is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await requestPasswordReset({ email: normalizedEmail });
      setSecurityQuestion(response?.securityQuestion || "");
      setMessage("Answer your security question to sign in.");
    } catch (err) {
      setError(err?.message || "Unable to load the security question.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedAnswer = securityAnswer.trim().toLowerCase();
    if (!normalizedAnswer) {
      setError("Security answer is required");
      return;
    }

    if (!/^[a-zA-Z]+$/.test(normalizedAnswer)) {
      setError("Security answer must be a single word");
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await loginWithSecurityAnswer({
        email: email.trim(),
        securityAnswer: normalizedAnswer,
      });
      setStoredAuth(session);
      navigate("/home");
    } catch (err) {
      setError(err?.message || "Incorrect security answer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-modern">
      <div className="auth-shell-modern">
        <div className="auth-card-modern">
          <Link to="/" className="auth-logo-modern">
            Skill Barter
          </Link>

          <div className="auth-header-modern">
            <span className="section-badge-modern muted">Recovery</span>
            <h2>Recover access without leaving the flow.</h2>
            <p className="auth-subtitle-modern">
              Enter your email, answer your security question, and get back into practice.
            </p>
          </div>

          <form
            onSubmit={securityQuestion ? handleAnswerSubmit : handleEmailSubmit}
            className="auth-form-modern"
          >
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className={`input-modern ${error && !securityQuestion ? "input-error" : ""}`}
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={Boolean(securityQuestion)}
              />
            </div>

            {securityQuestion ? (
              <div className="form-group">
                <label>Security Question</label>
                <input type="text" className="input-modern" value={securityQuestion} readOnly />
              </div>
            ) : null}

            {securityQuestion ? (
              <div className="form-group">
                <label>Answer</label>
                <input
                  type="text"
                  className={`input-modern ${error ? "input-error" : ""}`}
                  placeholder="Single word answer"
                  value={securityAnswer}
                  onChange={(event) => setSecurityAnswer(event.target.value)}
                />
              </div>
            ) : null}

            {error ? <div className="error-text">{error}</div> : null}
            {message ? <div className="success-text">{message}</div> : null}

            <button type="submit" className="btn-primary-modern w-full-modern" disabled={isSubmitting}>
              {isSubmitting
                ? securityQuestion
                  ? "Signing in..."
                  : "Loading question..."
                : securityQuestion
                  ? "Verify and sign in"
                  : "Continue"}
            </button>
          </form>

          <p className="auth-footer-modern">
            Remembered your password?{" "}
            <Link to="/login" className="auth-link-modern">
              Back to sign in
            </Link>
          </p>
        </div>

        <div className="auth-context-modern">
          <span className="section-badge-modern">How recovery works</span>
          <h3>Designed to get you back in quickly, not send you into a dead end.</h3>
          <div className="auth-benefit-list-modern">
            <div className="auth-benefit-item-modern">
              <KeyRound size={18} />
              <div>
                <strong>One short recovery path</strong>
                <p>Use the email tied to your account to load the security question for that profile.</p>
              </div>
            </div>
            <div className="auth-benefit-item-modern">
              <ShieldCheck size={18} />
              <div>
                <strong>Back into practice fast</strong>
                <p>Once verified, you are signed back in directly so you can continue your saved workflow.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
