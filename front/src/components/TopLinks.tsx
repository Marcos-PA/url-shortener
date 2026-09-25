import { useEffect, useState } from "react";
import { ExternalLinkIcon, TrophyIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/services/api";
import { listTopLinks } from "@/services/linkService";
import type { LinkPublic } from "@/types/link";

// Top 10 most clicked links across everyone. Shows the link only, never its owner.
export default function TopLinks() {
  const [links, setLinks] = useState<LinkPublic[] | null>(null);

  useEffect(() => {
    listTopLinks()
      .then(setLinks)
      .catch((err) => {
        setLinks([]);
        toast.error(getErrorMessage(err, "Could not load the most clicked links."), { id: "load-top" });
      });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Most clicked</CardTitle>
        <CardDescription>Top 10 links across everyone</CardDescription>
      </CardHeader>
      <CardContent>
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
                <TrophyIcon />
              </EmptyMedia>
              <EmptyTitle>No clicks yet</EmptyTitle>
              <EmptyDescription>Links show up here once someone opens them.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table aria-label="Most clicked links">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Short link</TableHead>
                <TableHead>Original URL</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((l, i) => (
                <TableRow key={l.code}>
                  <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
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
                  <TableCell className="max-w-56 truncate" title={l.url}>
                    {l.url}
                  </TableCell>
                  <TableCell className="text-right font-medium">{l.clicks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
