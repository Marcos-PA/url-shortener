import { api } from "./api";
import type { HealthResponse } from "../types/health";

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}
