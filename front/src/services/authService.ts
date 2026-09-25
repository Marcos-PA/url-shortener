import type { AuthResponse, Credentials, User } from "../types/auth";
import { api } from "./api";

export async function register(credentials: Credentials): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", credentials);
  return data;
}

export async function login(credentials: Credentials): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", credentials);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}
