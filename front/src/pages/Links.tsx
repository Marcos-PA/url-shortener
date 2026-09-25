import { useEffect, useState, type FormEvent } from "react";
import { CopyIcon, ExternalLinkIcon, LinkIcon, QrCodeIcon, Trash2Icon, WandSparklesIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import TopLinks from "@/components/TopLinks";
import UrlRuler from "@/components/UrlRuler";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/services/api";
import { createLink, deleteLink, listLinks } from "@/services/linkService";
import type { Link } from "@/types/link";

export default function Links() {
  const { user } = useAuth();
  // Anonymous visitors have no saved list: only the links created in this page, gone on reload.
  const [links, setLinks] = useState<Link[] | null>(user ? null : []);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Link | null>(null);
  const [personalLink, setPersonalLink] = useState("");
  // Bumped on delete so the ranking reloads (a deleted link may have been in it).
  const [topVersion, setTopVersion] = useState(0);
  const [showQr, setShowQr] = useState(false);

  // MainLayout mounts this page once the session is known and remounts it on login/logout.
  useEffect(() => {
    if (!user) return;
    listLinks()
      .then(setLinks)
      .catch((err) => {
        setLinks([]);
        toast.error(getErrorMessage(err, "Could not load links."), { id: "load-links" });
      });
  }, [user]);

  async function shorten(withQr: boolean) {
    setSaving(true);
    try {
      const saved = await createLink({ url, personal_link: personalLink.trim() || null });
      setLinks((prev) => [saved, ...(prev ?? [])]);
      setCreated(saved);
      setShowQr(withQr);
      setUrl("");
      setPersonalLink("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not shorten the URL."));
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    shorten(false);
  }

  // QR without clicking Shorten first: shortens the typed URL, or shows the QR of the last short link.
  function handleQr() {
    if (url.trim()) shorten(true);
    else setShowQr(true);
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
      setTopVersion((v) => v + 1);
      setCreated((prev) => (prev?.id === link.id ? null : prev));
      toast.success(`Link "${link.code}" deleted.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the link."));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Make long links short</h1>
        <p className="text-muted-foreground">
          Paste a long URL to get a short link you can share, with an optional custom name and QR code. Every
          click is counted, and with an account you keep track of all your links.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Links</CardTitle>
          <CardDescription>
            {!links
              ? "Loading..."
              : user
                ? `Your links · ${links.length} shortened`
                : "Links you create here stay only while this page is open and expire after 2 hours. Log in to keep them."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
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
            </div>
            <div className="flex gap-2">
              <InputGroup>
                <InputGroupAddon>
                  <WandSparklesIcon aria-hidden />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Personal link (optional)"
                  placeholder="personal-link (optional)"
                  pattern="[A-Za-z0-9_\-]{3,16}"
                  title="3 to 16 letters, numbers, - or _"
                  value={personalLink}
                  onChange={(e) => setPersonalLink(e.target.value)}
                />
              </InputGroup>
              <Button type="button" variant="outline" disabled={saving || (!url.trim() && !created)} onClick={handleQr}>
                <QrCodeIcon data-icon="inline-start" />
                QR code
              </Button>
            </div>
          </form>

          {created && (
            <Alert>
              <LinkIcon />
              <AlertTitle>Your short link</AlertTitle>
              <AlertDescription className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
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
                <div className="mt-3 w-full">
                  <UrlRuler original={created.url} short={created.short_url} />
                </div>
                {showQr && (
                  <div className="mt-4 flex justify-center">
                    {/* QR codes need dark-on-light to scan reliably: keep the library's black on white. */}
                    <QRCodeSVG
                      value={created.short_url}
                      size={160}
                      marginSize={2}
                      level="M"
                      title={`QR code for ${created.short_url}`}
                      className="rounded-md"
                    />
                  </div>
                )}
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
            <Table aria-label="Your links">
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
                      {user && (
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
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <TopLinks key={topVersion} />
    </div>
  );
}
