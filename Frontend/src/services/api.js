import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_BASE;

async function getAuthHeader() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function uploadAndGenerate(file) {
  const formData = new FormData();
  formData.append("file", file);
  const authHeader = await getAuthHeader();

  const res = await fetch(`${API_BASE}/uploadAndGenerate`, {
    method: "POST",
    headers: { ...authHeader },
    body: formData,
  });
  return res.json();
}

export async function startInterview(interviewId) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/startInterview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify({ interviewId }),
  });
  return res.json();
}

export async function submitAnswer(payload) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/submitAnswer`, {
    method: "POST",
    headers: { ...authHeader },
    body: payload,
  });
  return res.json();
}

export async function getInterviewSummary(interviewId) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/getInterviewSummary`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify({ interviewId }),
  });
  return res.json();
}
