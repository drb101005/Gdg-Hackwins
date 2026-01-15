import React from 'react';

export function PulseLoader({ size = 'md', color = 'blue' }) {
  const sizeClass = `pulse-loader-${size}`;
  const colorClass = `pulse-loader-${color}`;
  
  return (
    <div className={`pulse-loader ${sizeClass} ${colorClass}`}>
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}

export function WaveLoader({ size = 'md' }) {
  return (
    <div className={`wave-loader wave-loader-${size}`}>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}

export function VoiceWaveLoader({ isActive = false }) {
  return (
    <div className={`voice-wave-loader ${isActive ? 'active' : ''}`}>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}

export function OrbLoader({ size = 'md' }) {
  return (
    <div className={`orb-loader orb-loader-${size}`}>
      <div className="orb-inner"></div>
      <div className="orb-ring"></div>
      <div className="orb-ring orb-ring-2"></div>
    </div>
  );
}

export function AIThinkingLoader() {
  return (
    <div className="ai-thinking-loader">
      <div className="ai-brain">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div className="ai-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

export function SkeletonLoader({ width = '100%', height = '20px', rounded = false }) {
  return (
    <div 
      className={`skeleton-loader ${rounded ? 'rounded' : ''}`}
      style={{ width, height }}
    />
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <OrbLoader size="lg" />
      <p className="page-loader-text">Loading...</p>
    </div>
  );
}

export function ButtonLoader() {
  return (
    <div className="button-loader">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}
