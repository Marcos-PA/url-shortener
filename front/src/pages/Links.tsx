import { useEffect, useState, type FormEvent } from "react";
import { LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/services/api";
import { createLink, listLinks } from "@/services/linkService";
import type { Link } from "@/types/link";

export default function Links() {
  const [links, setLinks] = useState<Link[] | null>(null);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

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
      setUrl("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not shorten the URL."));
    } finally {
      setSaving(false);
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
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="max-w-64 truncate" title={l.url}>
                    {l.url}
                  </TableCell>
                  <TableCell className="font-mono">{l.code}</TableCell>
                  <TableCell className="text-right">{l.clicks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
