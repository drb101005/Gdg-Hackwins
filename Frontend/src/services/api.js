const API_BASE = import.meta.env.VITE_API_BASE;

export async function uploadAndGenerate(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/uploadAndGenerate`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function startInterview(interviewId) {
  const res = await fetch(`${API_BASE}/startInterview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interviewId }),
  });
  return res.json();
}

export async function submitAnswer(payload) {
  const res = await fetch(`${API_BASE}/submitAnswer`, {
    method: "POST",
    body: payload,
  });
  return res.json();
}

export async function getInterviewSummary(interviewId) {
  const res = await fetch(`${API_BASE}/getInterviewSummary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interviewId }),
  });
  return res.json();
}
