import { useEffect, useState, type FormEvent } from "react";
import { BookIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/services/api";
import { createLivro, deleteLivro, listLivros, updateLivro, type LivroInput } from "@/services/livroService";
import type { Livro } from "@/types/livro";

const vazio: LivroInput = { titulo: "", isbn: "", ano: null };

export default function Livros() {
  const [livros, setLivros] = useState<Livro[] | null>(null);
  const [form, setForm] = useState<LivroInput>(vazio);
  const [editando, setEditando] = useState<Livro | null>(null);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listLivros()
      .then(setLivros)
      .catch((err) => {
        setLivros([]);
        toast.error(getErrorMessage(err, "Não foi possível carregar os livros."), { id: "load-livros" });
      });
  }, []);

  function abrir(livro: Livro | null) {
    setEditando(livro);
    setForm(livro ? { titulo: livro.titulo, isbn: livro.isbn, ano: livro.ano } : vazio);
    setAberto(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (editando) {
        const salvo = await updateLivro(editando.id, form);
        setLivros((prev) => prev?.map((l) => (l.id === salvo.id ? salvo : l)) ?? null);
      } else {
        const salvo = await createLivro(form);
        setLivros((prev) => [...(prev ?? []), salvo]);
      }
      setAberto(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível salvar o livro."));
    } finally {
      setSalvando(false);
    }
  }

  async function handleDelete(livro: Livro) {
    try {
      await deleteLivro(livro.id);
      setLivros((prev) => prev?.filter((l) => l.id !== livro.id) ?? null);
      toast.success(`"${livro.titulo}" excluído.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível excluir o livro."));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Livros</CardTitle>
        <CardDescription>{livros ? `${livros.length} cadastrados` : "Carregando..."}</CardDescription>
        <CardAction>
          <Button onClick={() => abrir(null)}>
            <PlusIcon data-icon="inline-start" />
            Novo
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {!livros ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : livros.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhum livro</EmptyTitle>
              <EmptyDescription>Cadastre o primeiro livro no botão Novo.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {livros.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.titulo}</TableCell>
                  <TableCell>{l.isbn}</TableCell>
                  <TableCell>{l.ano ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label={`Editar "${l.titulo}"`} onClick={() => abrir(l)}>
                      <PencilIcon />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Excluir "${l.titulo}"`}>
                          <Trash2Icon />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir livro?</AlertDialogTitle>
                          <AlertDialogDescription>"{l.titulo}" será removido.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={() => handleDelete(l)}>
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
              <DialogTitle>{editando ? "Editar livro" : "Novo livro"}</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="livro-titulo">Título</FieldLabel>
                <Input
                  id="livro-titulo"
                  required
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="livro-isbn">ISBN</FieldLabel>
                <Input
                  id="livro-isbn"
                  required
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="livro-ano">Ano</FieldLabel>
                <Input
                  id="livro-ano"
                  type="number"
                  value={form.ano ?? ""}
                  onChange={(e) => setForm({ ...form, ano: Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber })}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="submit" disabled={salvando}>
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
