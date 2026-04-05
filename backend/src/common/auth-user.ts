export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  interviews_used: number;
  api_key: string | null;
  role: "student" | "admin";
  created_at: string;
};
