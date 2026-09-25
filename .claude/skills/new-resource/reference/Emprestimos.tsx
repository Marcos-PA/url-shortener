import { useEffect, useState, type FormEvent } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "react-day-picker/locale";
import { CalendarIcon, HandshakeIcon, PlusIcon, Trash2Icon, UndoIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/services/api";
import {
  createEmprestimo,
  deleteEmprestimo,
  devolverEmprestimo,
  listEmprestimos,
  type EmprestimoInput,
} from "@/services/emprestimoService";
import { listLivros } from "@/services/livroService";
import { listMembros } from "@/services/membroService";
import type { Emprestimo } from "@/types/emprestimo";
import type { Livro } from "@/types/livro";
import type { Membro } from "@/types/membro";

const vazio: EmprestimoInput = { livro_id: 0, membro_id: 0, data_prevista: "", hora_retirada: null };
const dataBR = (s: string) => format(parseISO(s), "dd/MM/yyyy");

export default function Emprestimos() {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[] | null>(null);
  const [livros, setLivros] = useState<Livro[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [form, setForm] = useState<EmprestimoInput>(vazio);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([listEmprestimos(), listLivros(), listMembros()])
      .then(([e, l, m]) => {
        setEmprestimos(e);
        setLivros(l);
        setMembros(m);
      })
      .catch((err) => {
        setEmprestimos([]);
        toast.error(getErrorMessage(err, "Não foi possível carregar os empréstimos."), { id: "load-emprestimos" });
      });
  }, []);

  const tituloLivro = (id: number) => livros.find((l) => l.id === id)?.titulo ?? "—";
  const nomeMembro = (id: number) => membros.find((m) => m.id === id)?.nome ?? "—";

  function abrir() {
    setForm(vazio);
    setAberto(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const salvo = await createEmprestimo(form);
      setEmprestimos((prev) => [...(prev ?? []), salvo]);
      setAberto(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível salvar o empréstimo."));
    } finally {
      setSalvando(false);
    }
  }

  async function handleDevolver(emprestimo: Emprestimo) {
    try {
      const salvo = await devolverEmprestimo(emprestimo.id);
      setEmprestimos((prev) => prev?.map((x) => (x.id === salvo.id ? salvo : x)) ?? null);
      toast.success(`"${tituloLivro(salvo.livro_id)}" devolvido.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível devolver o empréstimo."));
    }
  }

  async function handleDelete(emprestimo: Emprestimo) {
    try {
      await deleteEmprestimo(emprestimo.id);
      setEmprestimos((prev) => prev?.filter((x) => x.id !== emprestimo.id) ?? null);
      toast.success("Empréstimo excluído.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível excluir o empréstimo."));
    }
  }

  const completo = form.livro_id && form.membro_id && form.data_prevista;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Empréstimos</CardTitle>
        <CardDescription>
          {emprestimos ? `${emprestimos.filter((x) => !x.devolvido_em).length} em aberto` : "Carregando..."}
        </CardDescription>
        <CardAction>
          <Button onClick={abrir}>
            <PlusIcon data-icon="inline-start" />
            Novo
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {!emprestimos ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : emprestimos.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HandshakeIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhum empréstimo</EmptyTitle>
              <EmptyDescription>Registre o primeiro empréstimo no botão Novo.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Livro</TableHead>
                <TableHead>Membro</TableHead>
                <TableHead>Previsto</TableHead>
                <TableHead>Devolvido em</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {emprestimos.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="font-medium">{tituloLivro(x.livro_id)}</TableCell>
                  <TableCell>{nomeMembro(x.membro_id)}</TableCell>
                  <TableCell>
                    {dataBR(x.data_prevista)}
                    {x.hora_retirada && ` ${x.hora_retirada.slice(0, 5)}`}
                  </TableCell>
                  <TableCell>{x.devolvido_em ? dataBR(x.devolvido_em) : "—"}</TableCell>
                  <TableCell className="text-right">
                    {!x.devolvido_em && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Devolver "${tituloLivro(x.livro_id)}"`}
                        onClick={() => handleDevolver(x)}
                      >
                        <UndoIcon />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Excluir empréstimo de "${tituloLivro(x.livro_id)}"`}>
                          <Trash2Icon />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir empréstimo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O empréstimo de "{tituloLivro(x.livro_id)}" para {nomeMembro(x.membro_id)} será removido.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={() => handleDelete(x)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Novo empréstimo</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="emprestimo-livro">Livro</FieldLabel>
                <Select
                  value={form.livro_id ? String(form.livro_id) : ""}
                  onValueChange={(v) => setForm({ ...form, livro_id: Number(v) })}
                >
                  <SelectTrigger id="emprestimo-livro" className="w-full">
                    <SelectValue placeholder="Escolha um livro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {livros.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.titulo}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="emprestimo-membro">Membro</FieldLabel>
                <Select
                  value={form.membro_id ? String(form.membro_id) : ""}
                  onValueChange={(v) => setForm({ ...form, membro_id: Number(v) })}
                >
                  <SelectTrigger id="emprestimo-membro" className="w-full">
                    <SelectValue placeholder="Escolha um membro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {membros.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.nome}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="emprestimo-data">Data prevista</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="emprestimo-data" variant="outline" className="justify-start font-normal">
                      <CalendarIcon data-icon="inline-start" />
                      {form.data_prevista ? dataBR(form.data_prevista) : "Escolha a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      locale={ptBR}
                      selected={form.data_prevista ? parseISO(form.data_prevista) : undefined}
                      onSelect={(d) => setForm({ ...form, data_prevista: d ? format(d, "yyyy-MM-dd") : "" })}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field>
                <FieldLabel htmlFor="emprestimo-hora">Hora da retirada</FieldLabel>
                <Input
                  id="emprestimo-hora"
                  type="time"
                  value={form.hora_retirada?.slice(0, 5) ?? ""}
                  onChange={(e) => setForm({ ...form, hora_retirada: e.target.value || null })}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="submit" disabled={salvando || !completo}>
                {salvando && <Spinner data-icon="inline-start" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
