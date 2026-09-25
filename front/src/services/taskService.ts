import type { Task } from "../types/task";
import { api } from "./api";

export async function listTasks(): Promise<Task[]> {
  const { data } = await api.get<Task[]>("/tasks");
  return data;
}

export async function createTask(title : string): Promise<Task> {
  const { data } = await api.post<Task>("/tasks", { title });
  return data;
}

export async function updateTask(id: number, changes: Partial<Pick<Task, "title" | "done">>): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${id}`, changes);
  return data;
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
