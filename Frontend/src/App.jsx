import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Interview from './pages/Interview.jsx';
import ScheduledInterviews from './pages/ScheduledInterviews.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import Summary from './pages/Summary.jsx';
import Admin from './pages/Admin.jsx';
import SystemTestingDashboard from './pages/SystemTestingDashboard.jsx';
import AppLayout from './components/AppLayout.jsx';
import IntroAnimation from './components/IntroAnimation.jsx';

import BackButton from './components/BackButton.jsx';
import { useAuth } from './hooks/useAuth.js';

const INTRO_STORAGE_KEY = "ace_intro_seen";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return !window.sessionStorage.getItem(INTRO_STORAGE_KEY);
  });

  useEffect(() => {
    if (!showIntro) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setShowIntro(false);
      window.sessionStorage.setItem(INTRO_STORAGE_KEY, "true");
    }, 1800);

    return () => clearTimeout(timer);
  }, [showIntro]);

  if (showIntro) {
    return <IntroAnimation />;
  }

  return (
    <BrowserRouter>
      <BackButton />
      <div className="app">
        <Routes>
          {/* Public routes without sidebar */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes with sidebar */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/home" element={<Home />} />
            <Route path="/scheduled" element={<ScheduledInterviews />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/interview" element={<Interview />} />
            <Route path="/summary/:interviewId" element={<Summary />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/system-testing" element={<SystemTestingDashboard />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
