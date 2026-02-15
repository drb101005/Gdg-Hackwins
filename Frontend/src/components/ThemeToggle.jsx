import React, { useEffect, useState } from "react";

function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }

    setDarkMode(!darkMode);
  };

  return (
    <button className="theme-toggle" onClick={toggleTheme}>
      {darkMode ? "☀ Light" : "🌙 Dark"}
    </button>
  );
}

export default ThemeToggle;
