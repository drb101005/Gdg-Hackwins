import React, { useState } from 'react';

const mockScheduled = [
  {
    id: 1,
    type: 'Technical Interview',
    date: '2026-01-15',
    time: '10:00 AM',
    location: 'Google Meet'
  },
  {
    id: 2,
    type: 'Behavioral Interview',
    date: '2026-01-18',
    time: '2:00 PM',
    location: 'Zoom'
  }
];

function ScheduledInterviews() {
  const [scheduled, setScheduled] = useState(mockScheduled);
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!type || !date || !time) return;

    const newSession = {
      id: Date.now(),
      type,
      date,
      time,
      location: location || 'Virtual'
    };

    setScheduled([...scheduled, newSession]);
    setType('');
    setDate('');
    setTime('');
    setLocation('');
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="scheduled-page">
      <header className="page-header">
        <h1 className="page-title">Scheduled Interviews</h1>
        <p className="page-subtitle">Plan and manage your mock interview sessions</p>
      </header>

      <div className="scheduled-content">
        <div className="schedule-form card-glass">
          <h3 className="form-title">Schedule New Session</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Interview Type</label>
                <select
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  <option value="">Select type...</option>
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="Behavioral Interview">Behavioral Interview</option>
                  <option value="System Design">System Design</option>
                  <option value="Case Study">Case Study</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location / Platform</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Zoom, Google Meet"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-glow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Schedule Interview
            </button>
          </form>
        </div>

        <div className="upcoming-section">
          <h3 className="section-title">Upcoming Sessions</h3>

          <div className="upcoming-list">
            {scheduled.length === 0 ? (
              <div className="empty-state card-glass">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p>No scheduled interviews yet</p>
              </div>
            ) : (
              scheduled.map((session) => (
                <div key={session.id} className="upcoming-card card-glass">
                  <div className="upcoming-date">
                    <span className="date-day">{formatDate(session.date)}</span>
                    <span className="date-time">{session.time}</span>
                  </div>
                  <div className="upcoming-info">
                    <span className="upcoming-type">{session.type}</span>
                    <span className="upcoming-location">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {session.location}
                    </span>
                  </div>
                  <button className="btn btn-secondary">
                    Start
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScheduledInterviews;
