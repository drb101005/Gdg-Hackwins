import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { ArrowRight, AudioLines, CheckCircle, CirclePlay, FileText, Gauge, ShieldCheck, Sparkles, TimerReset, Waves, XCircle, Zap } from "lucide-react";
import { getSystemHealth } from "../services/api";

const STEP_ITEMS = [
  {
    id: "context",
    icon: FileText,
    title: "Add your target role",
    description: "Bring in your resume, job description, and focus areas so the session reflects the role you want.",
  },
  {
    id: "respond",
    icon: TimerReset,
    title: "Answer under timing",
    description: "Practice in timed rounds with local recording so your delivery gets tested, not just your memory.",
  },
  {
    id: "review",
    icon: Gauge,
    title: "Review what changed",
    description: "Revisit transcripts, pacing, filler words, and feedback after the session to sharpen your next round.",
  },
];

const DIFFERENTIATORS = [
  {
    id: "local",
    icon: ShieldCheck,
    title: "Local-first workflow",
    description: "The core practice loop runs against your local stack, which keeps demo sessions fast and predictable.",
  },
  {
    id: "role-aware",
    icon: Sparkles,
    title: "Context-aware prompts",
    description: "Questions can be shaped around your role, resume, company target, and focus areas instead of generic prompts.",
  },
  {
    id: "delivery",
    icon: AudioLines,
    title: "Answer delivery, not just content",
    description: "The product captures how you speak, not only what you type, so you can practice for real interview pressure.",
  },
  {
    id: "progress",
    icon: Zap,
    title: "Feedback tied to sessions",
    description: "Your recordings, summaries, and progress views stay connected to each practice round for repeat improvement.",
  },
];

function Landing() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activePreview, setActivePreview] = useState(0);
  const [systemStatus, setSystemStatus] = useState({
    loading: true,
    backendReady: false,
    aiReady: false,
    message: "Checking local services...",
  });

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    getSystemHealth()
      .then((response) => {
        const data = response?.data || {};
        setSystemStatus({
          loading: false,
          backendReady: data.database === "ok",
          aiReady: data.ai_service === "ok",
          message: response?.message || "Local interview services are available.",
        });
      })
      .catch((error) => {
        setSystemStatus({
          loading: false,
          backendReady: false,
          aiReady: false,
          message: error?.message || "Local services are unavailable right now.",
        });
      });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivePreview((current) => (current + 1) % 3);
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);

  const heroPreviewItems = useMemo(
    () => [
      {
        id: "setup",
        eyebrow: "Step 1",
        title: "Shape the interview around your target role",
        summary: "Use real context from your prep so the session starts closer to the interview you actually want.",
        bullets: [
          "Role and difficulty selected",
          "Resume context added",
          "Job description pasted",
        ],
        footer: systemStatus.backendReady ? "Question setup is ready on this device." : "Start the local backend to unlock full setup.",
      },
      {
        id: "session",
        eyebrow: "Step 2",
        title: "Practice under time, not just on paper",
        summary: "Run through timed answers with recording and flow that mirrors a focused mock interview.",
        bullets: [
          "Timed question rounds",
          "Audio captured locally",
          "Resume the same session later",
        ],
        footer: "The live session emphasizes delivery, pacing, and confidence under pressure.",
      },
      {
        id: "review",
        eyebrow: "Step 3",
        title: "Turn one session into better next answers",
        summary: "Review transcripts, pacing, and feedback so each round teaches you what to fix next.",
        bullets: [
          systemStatus.aiReady ? "AI feedback available" : "Local fallback review available",
          "Transcript and session summary",
          "Progress visible in dashboard views",
        ],
        footer: systemStatus.aiReady ? "Feedback services are currently reachable." : "Core practice still works even when optional AI services are offline.",
      },
    ],
    [systemStatus.aiReady, systemStatus.backendReady],
  );

  const activeItem = heroPreviewItems[activePreview];

  return (
    <div className="landing-modern">
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      <nav className="landing-nav-modern">
        <Link to="/" className="logo-modern">
          Skill Barter
        </Link>

        <div className="landing-nav-links">
          <a href="#how-it-works" className="nav-link-modern">How it works</a>
          <a href="#why-skillbarter" className="nav-link-modern">Why it stands out</a>
          <a href="#start-now" className="nav-link-modern">Get started</a>
        </div>

        <div className="nav-links-modern">
          <ThemeToggle />
          <Link to="/login" className="nav-link-modern">
            Login
          </Link>
          <Link to="/signup" className="btn-primary-modern">
            Create Account
          </Link>
        </div>
      </nav>

      <section className="hero-modern landing-hero-enhanced">
        <div className="hero-text">
          <div className="hero-kicker-modern">
            <Waves size={16} />
            <span>Interview prep for students, interns, and early-career candidates</span>
          </div>

          <h1>Get sharper interview answers in one focused practice session.</h1>
          <p>
            Build a role-aware mock interview, answer under timing, and review feedback without leaving your local workflow.
          </p>

          <div className="hero-actions-modern">
            <Link to="/signup" className="btn-primary-modern hero-primary-cta">
              Start a practice round <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works" className="btn-secondary-modern">
              See how it works
            </a>
          </div>

          <p className="hero-microcopy-modern">
            {systemStatus.loading
              ? "Checking the local setup for this device."
              : systemStatus.backendReady
                ? "Local practice services are available right now."
                : systemStatus.message}
          </p>

          <div className="hero-trust-row-modern">
            <span className={`hero-trust-pill ${systemStatus.backendReady ? "ready" : "offline"}`}>
              {systemStatus.backendReady ? "Backend ready" : "Backend offline"}
            </span>
            <span className={`hero-trust-pill ${systemStatus.aiReady ? "ready" : "neutral"}`}>
              {systemStatus.aiReady ? "AI feedback ready" : "Local fallback available"}
            </span>
          </div>
        </div>

        <div className="hero-image-container">
          <div className="hero-preview-panel">
            <div className="hero-preview-header">
              <div>
                <span className="preview-label-modern">Live product preview</span>
                <h2>{activeItem.title}</h2>
              </div>
              <span className="preview-step-modern">{activeItem.eyebrow}</span>
            </div>

            <p className="hero-preview-summary">{activeItem.summary}</p>

            <div className="hero-preview-tabs">
              {heroPreviewItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`hero-preview-tab ${index === activePreview ? "active" : ""}`}
                  onClick={() => setActivePreview(index)}
                >
                  {item.eyebrow}
                </button>
              ))}
            </div>

            <div className="hero-preview-card-shell">
              <div className="hero-preview-status-row">
                <span className="hero-preview-chip">Role aware</span>
                <span className="hero-preview-chip">Timed flow</span>
                <span className="hero-preview-chip">Saved locally</span>
              </div>

              <div className="hero-preview-list">
                {activeItem.bullets.map((bullet) => (
                  <div key={bullet} className="hero-preview-list-item">
                    <CheckCircle size={16} />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>

              <div className="hero-preview-footer">
                <div>
                  <strong>Preview before signing in</strong>
                  <p>{activeItem.footer}</p>
                </div>
                <CirclePlay size={28} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="preview-section landing-section-block" id="how-it-works">
        <div className="landing-section-heading">
          <span className="section-badge-modern">How it works</span>
          <h2>Three steps from setup to useful feedback</h2>
          <p>
            The flow stays lightweight so you can get into practice quickly and still leave with something actionable.
          </p>
        </div>

        <div className="feature-grid">
          {STEP_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="feature-card feature-step-card">
                <div className="feature-step-topline">
                  <span className="feature-step-number">0{index + 1}</span>
                  <div className="feature-icon">
                    <Icon size={22} />
                  </div>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="philosophy-section" id="why-skillbarter">
        <div className="landing-section-heading">
          <span className="section-badge-modern muted">Why it stands out</span>
          <h2>Built for realistic prep, not passive browsing</h2>
          <p>
            The product is different when it asks for actual delivery, keeps context attached to the interview, and lets you review the result session by session.
          </p>
        </div>

        <div className="feature-grid">
          {DIFFERENTIATORS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="feature-card differentiator-card-modern">
                <div className="feature-icon">
                  <Icon size={22} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            );
          })}
        </div>

        <div className="philosophy-grid philosophy-grid-modernized">
          <div className="philosophy-panel-modern">
            <h3>What this is</h3>
            <ul className="philosophy-list-modern">
              <li><CheckCircle size={18} /> A structured thinking trainer</li>
              <li><CheckCircle size={18} /> A pressure simulator for delivery</li>
              <li><CheckCircle size={18} /> A review loop tied to each session</li>
            </ul>
          </div>

          <div className="philosophy-panel-modern">
            <h3>What this is not</h3>
            <ul className="philosophy-list-modern muted">
              <li><XCircle size={18} /> A script memorizer</li>
              <li><XCircle size={18} /> A generic question dump</li>
              <li><XCircle size={18} /> A cloud-only showcase with no local path</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="builder-note">
        <div className="builder-note-card-modern">
          <ShieldCheck size={32} color="var(--accent)" style={{ flexShrink: 0 }} />
          <div>
            <span className="section-badge-modern muted">Low-friction preview</span>
            <h2>See the workflow before you commit to it</h2>
            <p>
              The landing page preview shows how the session is structured so new users can understand the product before they authenticate.
            </p>
            <div className="builder-note-actions">
              <a href="#how-it-works" className="btn-secondary-modern">Explore the flow</a>
              <Link to="/signup" className="btn-primary-modern">Create your account</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="start-now">
        <div className="final-cta-inner-modern">
          <span className="section-badge-modern">Start now</span>
          <h2>Practice the next interview before it becomes the real one.</h2>
          <p>
            Start with one focused session, then use the dashboard and summaries to keep improving from there.
          </p>
          <div className="hero-actions-modern final-cta-actions">
            <Link to="/signup" className="btn-primary-modern">
              Start your first session <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-secondary-modern">
              Continue where you left off
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer-modern">
        <p>Built by SE - IT - B</p>
      </footer>
    </div>
  );
}

export default Landing;
