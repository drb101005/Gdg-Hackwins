import React, { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";

function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const toggleTheme = () => {
    const nextMode = !darkMode;
    localStorage.setItem("theme", nextMode ? "dark" : "light");
    setDarkMode(nextMode);
  };

  return (
    <button className="theme-toggle" onClick={toggleTheme} type="button" aria-label="Toggle theme">
      {darkMode ? <SunMedium size={16} /> : <MoonStar size={16} />}
      <span>{darkMode ? "Light" : "Dark"}</span>
    </button>
  );
}

export default ThemeToggle;
