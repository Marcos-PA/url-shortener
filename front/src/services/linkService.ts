import type { Link, LinkInput } from "../types/link";
import { api } from "./api";

export async function listLinks(): Promise<Link[]> {
  const { data } = await api.get<Link[]>("/links");
  return data;
}

export async function createLink(input: LinkInput): Promise<Link> {
  const { data } = await api.post<Link>("/links", input);
  return data;
}
