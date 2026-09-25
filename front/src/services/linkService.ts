import type { Link, LinkInput, LinkPublic } from "../types/link";
import { api } from "./api";

export async function listLinks(): Promise<Link[]> {
  const { data } = await api.get<Link[]>("/links");
  return data;
}

export async function createLink(input: LinkInput): Promise<Link> {
  const { data } = await api.post<Link>("/links", input);
  return data;
}

export async function deleteLink(id: number): Promise<void> {
  await api.delete(`/links/${id}`);
}

export async function listTopLinks(): Promise<LinkPublic[]> {
  const { data } = await api.get<LinkPublic[]>("/links/top");
  return data;
}
