import { useEffect, useState, type FormEvent } from "react";
import { CopyIcon, ExternalLinkIcon, LinkIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/services/api";
import { createLink, deleteLink, listLinks } from "@/services/linkService";
import type { Link } from "@/types/link";

export default function Links() {
  const [links, setLinks] = useState<Link[] | null>(null);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Link | null>(null);

  useEffect(() => {
    listLinks()
      .then(setLinks)
      .catch((err) => {
        setLinks([]);
        toast.error(getErrorMessage(err, "Could not load links."), { id: "load-links" });
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await createLink({ url });
      setLinks((prev) => [saved, ...(prev ?? [])]);
      setCreated(saved);
      setUrl("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not shorten the URL."));
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(link: Link) {
    try {
      await navigator.clipboard.writeText(link.short_url);
      toast.success("Short link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  async function handleDelete(link: Link) {
    try {
      await deleteLink(link.id);
      setLinks((prev) => prev?.filter((l) => l.id !== link.id) ?? null);
      setCreated((prev) => (prev?.id === link.id ? null : prev));
      toast.success(`Link "${link.code}" deleted.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the link."));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Links</CardTitle>
        <CardDescription>{links ? `${links.length} shortened` : "Loading..."}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Field>
            <FieldLabel htmlFor="link-url">Long URL</FieldLabel>
            <Input
              id="link-url"
              type="url"
              required
              placeholder="https://example.com/some/long/path"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={saving || !url.trim()}>
            {saving && <Spinner data-icon="inline-start" />}
            Shorten
          </Button>
        </form>

        {created && (
          <Alert>
            <LinkIcon />
            <AlertTitle>Your short link</AlertTitle>
            <AlertDescription>
              <div className="flex items-center gap-2">
                <a
                  href={created.short_url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate font-mono text-primary underline"
                >
                  {created.short_url}
                </a>
                <Button variant="outline" size="sm" onClick={() => handleCopy(created)}>
                  <CopyIcon data-icon="inline-start" />
                  Copy
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!links ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LinkIcon />
              </EmptyMedia>
              <EmptyTitle>No links yet</EmptyTitle>
              <EmptyDescription>Paste a long URL above to create the first one.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Original URL</TableHead>
                <TableHead>Short link</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="max-w-64 truncate" title={l.url}>
                    {l.url}
                  </TableCell>
                  <TableCell>
                    <a
                      href={l.short_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-primary underline"
                    >
                      {l.code}
                      <ExternalLinkIcon aria-hidden className="size-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-right">{l.clicks}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label={`Copy "${l.code}"`} onClick={() => handleCopy(l)}>
                      <CopyIcon />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Delete "${l.code}"`}>
                          <Trash2Icon />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this link?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The short link "{l.code}" will stop working and its click count will be lost.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={() => handleDelete(l)}>
                            Delete
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
    </Card>
  );
}
