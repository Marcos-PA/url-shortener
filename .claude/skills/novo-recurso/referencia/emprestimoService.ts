import type { Emprestimo } from "../types/emprestimo";
import { api } from "./api";

// devolvido_em é preenchido pelo back (POST /devolver), fica fora do Create.
export type EmprestimoInput = Omit<Emprestimo, "id" | "devolvido_em">;

export async function listEmprestimos(): Promise<Emprestimo[]> {
  const { data } = await api.get<Emprestimo[]>("/emprestimos");
  return data;
}

export async function createEmprestimo(emprestimo: EmprestimoInput): Promise<Emprestimo> {
  const { data } = await api.post<Emprestimo>("/emprestimos", emprestimo);
  return data;
}

export async function devolverEmprestimo(id: number): Promise<Emprestimo> {
  const { data } = await api.post<Emprestimo>(`/emprestimos/${id}/devolver`);
  return data;
}

export async function deleteEmprestimo(id: number): Promise<void> {
  await api.delete(`/emprestimos/${id}`);
}
