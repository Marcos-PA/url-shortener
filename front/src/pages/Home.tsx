import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getHealth } from "@/services/healthService";
import type { HealthResponse } from "@/types/health";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setError(true));
  }, []);

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">URL Shortener</h1>
        <p className="text-muted-foreground">Organize o que precisa ser feito, marque o que já foi.</p>
        <div>
          <Button asChild>
            <Link to="/tasks">
              Ir para Tasks
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status do sistema</CardTitle>
          <CardDescription>Conexão com o back-end e o banco de dados</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Falha ao conectar</AlertTitle>
              <AlertDescription>
                O back está rodando? No Render free, a 1ª chamada pode levar ~1 min.
              </AlertDescription>
            </Alert>
          ) : !health ? (
            <div className="flex gap-2" aria-busy="true">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-28" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">API: {health.status}</Badge>
              <Badge variant="secondary">Banco: {health.database}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
