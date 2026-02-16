import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Interview from './pages/Interview.jsx';
import ScheduledInterviews from './pages/ScheduledInterviews.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import AppLayout from './components/AppLayout.jsx';
import IntroAnimation from './components/IntroAnimation.jsx';

function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, []);

  if (showIntro) {
    return <IntroAnimation />;
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          {/* Public routes without sidebar */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/interview" element={<Interview />} />

          {/* Protected routes with sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/scheduled" element={<ScheduledInterviews />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
