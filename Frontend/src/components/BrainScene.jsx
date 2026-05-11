import React from "react";

export default function BrainScene() {
  return (
    <div style={containerStyle}>
      <svg
        viewBox="0 0 200 200"
        style={svgStyle}
      >
        {/* Background */}
        <rect width="200" height="200" fill="#e5e5e5" />

        {/* Chip Body */}
        <rect
          x="40"
          y="40"
          width="120"
          height="120"
          rx="18"
          fill="white"
          stroke="black"
          strokeWidth="4"
        />

        {/* Brain Outline */}
        <path
          d="
            M100 75
            C85 55, 60 70, 65 90
            C55 100, 65 125, 85 120
            C90 135, 110 135, 115 120
            C135 125, 145 100, 135 90
            C140 70, 115 55, 100 75
            Z
          "
          fill="none"
          stroke="black"
          strokeWidth="3"
        />

        {/* Brain Center Divider */}
        <line
          x1="100"
          y1="75"
          x2="100"
          y2="120"
          stroke="black"
          strokeWidth="2"
        />

        {/* Left Brain Folds */}
        <path
          d="M85 85 C75 85, 75 100, 85 100"
          fill="none"
          stroke="black"
          strokeWidth="2"
        />
        <path
          d="M80 95 C70 95, 70 110, 85 110"
          fill="none"
          stroke="black"
          strokeWidth="2"
        />

        {/* Right Brain Folds */}
        <path
          d="M115 85 C125 85, 125 100, 115 100"
          fill="none"
          stroke="black"
          strokeWidth="2"
        />
        <path
          d="M120 95 C130 95, 130 110, 115 110"
          fill="none"
          stroke="black"
          strokeWidth="2"
        />

        {/* Left Circuit Pins */}
        <line x1="40" y1="80" x2="20" y2="80" stroke="black" strokeWidth="3" />
        <circle cx="15" cy="80" r="4" fill="black" />

        <line x1="40" y1="100" x2="20" y2="100" stroke="black" strokeWidth="3" />
        <circle cx="15" cy="100" r="4" fill="black" />

        <line x1="40" y1="120" x2="20" y2="120" stroke="black" strokeWidth="3" />
        <circle cx="15" cy="120" r="4" fill="black" />

        {/* Right Circuit Pins */}
        <line x1="160" y1="80" x2="180" y2="80" stroke="black" strokeWidth="3" />
        <circle cx="185" cy="80" r="4" fill="black" />

        <line x1="160" y1="100" x2="180" y2="100" stroke="black" strokeWidth="3" />
        <circle cx="185" cy="100" r="4" fill="black" />

        <line x1="160" y1="120" x2="180" y2="120" stroke="black" strokeWidth="3" />
        <circle cx="185" cy="120" r="4" fill="black" />

        {/* Top Circuit Pins */}
        <line x1="80" y1="40" x2="80" y2="20" stroke="black" strokeWidth="3" />
        <circle cx="80" cy="15" r="4" fill="black" />

        <line x1="100" y1="40" x2="100" y2="15" stroke="black" strokeWidth="3" />
        <circle cx="100" cy="10" r="4" fill="black" />

        <line x1="120" y1="40" x2="120" y2="20" stroke="black" strokeWidth="3" />
        <circle cx="120" cy="15" r="4" fill="black" />

        {/* Bottom Circuit Pins */}
        <line x1="80" y1="160" x2="80" y2="180" stroke="black" strokeWidth="3" />
        <circle cx="80" cy="185" r="4" fill="black" />

        <line x1="100" y1="160" x2="100" y2="185" stroke="black" strokeWidth="3" />
        <circle cx="100" cy="190" r="4" fill="black" />

        <line x1="120" y1="160" x2="120" y2="180" stroke="black" strokeWidth="3" />
        <circle cx="120" cy="185" r="4" fill="black" />
      </svg>
    </div>
  );
}

const containerStyle = {
  width: "350px",
  height: "350px",
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const svgStyle = {
  width: "100%",
  height: "100%",
};
