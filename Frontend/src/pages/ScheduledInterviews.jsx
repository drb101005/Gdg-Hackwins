import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

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
    date: '2026-01-16',
    time: '2:00 PM',
    location: 'Zoom'
  }
];

function ScheduledInterviews() {
  const navigate = useNavigate(); // Initialize hook
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
    alert("Session Scheduled Successfully!");
  };

  // --- NEW FUNCTION: Handle Start Button ---
  const handleStartSession = (session) => {
    // Navigate to the interview page
    // Pass the "type" (e.g., "Technical Interview") as the topic state
    navigate('/interview', { state: { topic: session.type } });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
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
        {/* Schedule Form */}
        <div className="schedule-form card-glass" style={{ position: 'relative', zIndex: 10 }}>
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
                  style={{ backgroundColor: '#222', color: 'white' }}
                >
                  <option value="">Select type...</option>
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="Behavioral Interview">Behavioral Interview</option>
                  <option value="System Design">System Design</option>
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
                  style={{ colorScheme: 'dark' }} 
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
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Zoom"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-glow" style={{ marginTop: '15px', cursor: 'pointer' }}>
              Schedule Interview
            </button>
          </form>
        </div>

        {/* Upcoming Sessions List */}
        <div className="upcoming-section">
          <h3 className="section-title">Upcoming Sessions</h3>
          <div className="upcoming-list">
            {scheduled.map((session) => (
              <div key={session.id} className="upcoming-card card-glass">
                <div className="upcoming-date">
                  <span className="date-day">{formatDate(session.date)}</span>
                  <span className="date-time">{session.time}</span>
                </div>
                <div className="upcoming-info">
                  <span className="upcoming-type">{session.type}</span>
                  <span className="upcoming-location">{session.location}</span>
                </div>
                {/* CONNECTED START BUTTON */}
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleStartSession(session)}
                >
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScheduledInterviews;