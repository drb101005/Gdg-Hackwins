import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const mockScheduled = [
  {
    id: 1,
    type: "Technical Interview",
    date: "2026-01-15",
    time: "10:00 AM",
    location: "Google Meet",
  },
  {
    id: 2,
    type: "Behavioral Interview",
    date: "2026-01-16",
    time: "2:00 PM",
    location: "Zoom",
  },
];

function ScheduledInterviews() {
  const navigate = useNavigate();

  const [scheduled, setScheduled] = useState(mockScheduled);
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!type || !date || !time) return;

    const newSession = {
      id: Date.now(),
      type,
      date,
      time,
      location: location || "Virtual",
    };

    setScheduled([...scheduled, newSession]);
    setType("");
    setDate("");
    setTime("");
    setLocation("");
  };

  const handleStartSession = (session) => {
    navigate("/interview", { state: { topic: session.type } });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="scheduled-modern">

      <div className="scheduled-header-modern">
        <h1>Scheduled Sessions</h1>
        <p>Plan your mock interviews and launch them when ready.</p>
      </div>

      {/* FORM */}
      <div className="card-modern">
        <h3>Schedule a new session</h3>

        <form onSubmit={handleSubmit} className="scheduled-form-modern">

          <div className="form-row-modern">
            <div>
              <label className="label-modern">Interview Type</label>
              <select
                className="input-modern"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
              >
                <option value="">Select type</option>
                <option value="Technical Interview">Technical Interview</option>
                <option value="Behavioral Interview">Behavioral Interview</option>
                <option value="System Design">System Design</option>
              </select>
            </div>

            <div>
              <label className="label-modern">Date</label>
              <input
                type="date"
                className="input-modern"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row-modern">
            <div>
              <label className="label-modern">Time</label>
              <input
                type="time"
                className="input-modern"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label-modern">Location</label>
              <input
                type="text"
                className="input-modern"
                placeholder="Zoom / Meet / Virtual"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary-modern">
            Schedule Session
          </button>

        </form>
      </div>

      {/* LIST */}
      <div className="scheduled-list-modern">

        <h3>Upcoming Sessions</h3>

        {scheduled.map((session) => (
          <div key={session.id} className="scheduled-item-modern">
            <div>
              <strong>{session.type}</strong>
              <div className="session-meta-modern">
                {formatDate(session.date)} • {session.time} • {session.location}
              </div>
            </div>

            <button
              className="btn-secondary-modern"
              onClick={() => handleStartSession(session)}
            >
              Start
            </button>
          </div>
        ))}

      </div>
    </div>
  );
}

export default ScheduledInterviews;
