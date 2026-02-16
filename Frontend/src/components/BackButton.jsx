import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show back button on landing page or login/signup if you don't want to
  // For now, per user request "every pagfe", we'll just show it everywhere
  // except maybe the root path if it's the landing page and there's nowhere to go back to?
  // But typically "back" means history.back().

  const handleBack = () => {
    navigate(-1);
  };

  // Optional: Hide on root path if desired, but user asked for "every page"
  // if (location.pathname === '/') return null; 

  return (
    <button
      onClick={handleBack}
      className="fixed top-4 left-4 z-50 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10 group"
      aria-label="Go back"
    >
      <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
    </button>
  );
};

export default BackButton;
