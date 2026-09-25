import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

// FastAPI responde { detail: "texto" } (HTTPException) ou { detail: [{ loc, msg }] } (422 de validação).
export function getErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback;
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d: { loc?: unknown[]; msg: string }) => `${d.loc?.at(-1) ?? "campo"}: ${d.msg}`).join("; ");
  }
  return fallback;
}
