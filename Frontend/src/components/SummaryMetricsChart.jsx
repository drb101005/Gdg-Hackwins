import React from "react";

function formatValue(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function SummaryMetricsChart({ points }) {
  if (!points?.length) {
    return null;
  }

  return (
    <section className="card-modern summary-graph-modern">
      <div className="summary-graph-header-modern">
        <div>
          <h3>Answer Metrics</h3>
          <p className="hint-modern">A compact per-question table so you can compare every answer without repeated labels.</p>
        </div>
      </div>

      <div className="table-modern-wrapper">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Question</th>
              <th>Score</th>
              <th>WPM</th>
              <th>Pauses</th>
              <th>Fillers</th>
              <th>Silence</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.label}>
                <td>{point.label}</td>
                <td>{formatValue(Number(point.score || 0))}/10</td>
                <td>{formatValue(Number(point.wpm || 0))}</td>
                <td>{formatValue(Number(point.pause_count || 0))}</td>
                <td>{formatValue(Number(point.filler_count || 0))}</td>
                <td>{formatValue(Number(point.silence_percent || 0))}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default SummaryMetricsChart;
