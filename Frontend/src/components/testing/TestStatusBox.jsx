import React from "react";

const STATUS_COPY = {
  idle: {
    label: "Ready",
    className: "testing-status-idle",
  },
  loading: {
    label: "Processing",
    className: "testing-status-loading",
  },
  success: {
    label: "Success",
    className: "testing-status-success",
  },
  error: {
    label: "Failed",
    className: "testing-status-error",
  },
};

function TestStatusBox({ status = "idle", message }) {
  const config = STATUS_COPY[status] || STATUS_COPY.idle;

  return (
    <div className={`testing-status-box ${config.className}`}>
      <div className="testing-status-header">
        <span className="testing-status-pill">{config.label}</span>
      </div>
      <p>{message || "Ready for testing."}</p>
    </div>
  );
}

export default TestStatusBox;
