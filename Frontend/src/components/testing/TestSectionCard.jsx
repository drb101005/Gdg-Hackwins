import React from "react";
import TestStatusBox from "./TestStatusBox";

function TestSectionCard({ title, description, status, children }) {
  return (
    <section className="card-modern testing-card-modern">
      <div className="testing-card-header">
        <div>
          <h2>{title}</h2>
          <p className="hint-modern">{description}</p>
        </div>
      </div>

      <div className="testing-card-body">{children}</div>
      <TestStatusBox status={status?.status} message={status?.message} />
    </section>
  );
}

export default TestSectionCard;
