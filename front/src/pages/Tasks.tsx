import { useEffect, useState, type FormEvent } from "react";
import { ClipboardListIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/services/api";
import { createTask, deleteTask, listTasks, updateTask } from "@/services/taskService";
import type { Task } from "@/types/task";

type Filter = "all" | "pending" | "done";

const emptyMessages: Record<Filter, string> = {
  all: "Adicione a primeira task no campo acima.",
  pending: "Nada pendente. Tudo em dia!",
  done: "Nenhuma task concluída ainda.",
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    listTasks()
      .then(setTasks)
      .catch((err) => {
        setTasks([]);
        toast.error(getErrorMessage(err, "Não foi possível carregar as tasks."), { id: "load-tasks" });
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || adding) return;
    setAdding(true);
    try {
      const task = await createTask(title.trim());
      setTasks((prev) => [...(prev ?? []), task]);
      setTitle("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível adicionar a task."));
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(task: Task) {
    try {
      const updated = await updateTask(task.id, { done: !task.done });
      setTasks((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível atualizar a task."));
    }
  }

  async function handleDelete(task: Task) {
    try {
      await deleteTask(task.id);
      setTasks((prev) => prev?.filter((t) => t.id !== task.id) ?? null);
      toast.success(`"${task.title}" excluída.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível excluir a task."));
    }
  }

  const doneCount = tasks?.filter((t) => t.done).length ?? 0;
  const visible = tasks?.filter((t) => filter === "all" || t.done === (filter === "done")) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Tasks</CardTitle>
        <CardDescription>
          {tasks ? `${doneCount} de ${tasks.length} concluídas` : "Carregando..."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="new-task" className="sr-only">
              Nova task
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="new-task"
                placeholder="O que precisa ser feito?"
                autoComplete="off"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="submit" variant="default" disabled={adding || !title.trim()}>
                  {adding ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
                  Adicionar
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </form>

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={filter}
          onValueChange={(v) => v && setFilter(v as Filter)}
          aria-label="Filtrar tasks"
          className="self-start"
        >
          <ToggleGroupItem value="all">Todas</ToggleGroupItem>
          <ToggleGroupItem value="pending">Pendentes</ToggleGroupItem>
          <ToggleGroupItem value="done">Concluídas</ToggleGroupItem>
        </ToggleGroup>

        {!tasks ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardListIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhuma task aqui</EmptyTitle>
              <EmptyDescription>{emptyMessages[filter]}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {visible.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
                <Checkbox id={`task-${t.id}`} checked={t.done} onCheckedChange={() => handleToggle(t)} />
                <Label
                  htmlFor={`task-${t.id}`}
                  className={cn("flex-1 truncate", t.done && "text-muted-foreground line-through")}
                >
                  {t.title}
                </Label>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir "${t.title}"`}
                  onClick={() => handleDelete(t)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
