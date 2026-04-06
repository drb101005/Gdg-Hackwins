import React from "react";

const METRICS = [
  { key: "score", label: "Score", unit: "/10", max: 10, color: "#4f46e5" },
  { key: "wpm", label: "WPM", unit: "", max: null, color: "#0ea5e9" },
  { key: "pause_count", label: "Pauses", unit: "", max: null, color: "#f97316" },
  { key: "filler_count", label: "Fillers", unit: "", max: null, color: "#ef4444" },
  { key: "silence_percent", label: "Silence", unit: "%", max: 100, color: "#14b8a6" },
];

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
          <p className="hint-modern">A quick per-question view of score, pace, pauses, filler words, and silence.</p>
        </div>
      </div>

      <div className="summary-graph-grid-modern">
        {METRICS.map((metric) => {
          const values = points.map((point) => Number(point[metric.key] || 0));
          const maxValue = metric.max || Math.max(1, ...values);
          const average =
            values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

          return (
            <article key={metric.key} className="summary-graph-card-modern">
              <div className="summary-graph-card-header-modern">
                <strong>{metric.label}</strong>
                <span>
                  Avg {formatValue(average)}
                  {metric.unit}
                </span>
              </div>

              <div className="summary-bars-modern">
                {points.map((point) => {
                  const rawValue = Number(point[metric.key] || 0);
                  const height = Math.max(6, Math.round((rawValue / maxValue) * 100));

                  return (
                    <div key={`${metric.key}-${point.label}`} className="summary-bar-modern">
                      <div
                        className="summary-bar-fill-modern"
                        style={{ height: `${height}%`, background: metric.color }}
                        title={`${point.label}: ${formatValue(rawValue)}${metric.unit}`}
                      />
                      <span>{point.label}</span>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default SummaryMetricsChart;
