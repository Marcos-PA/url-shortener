import { ListChecksIcon } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

const links = [
  { to: "/", label: "Início" },
  { to: "/tasks", label: "Tasks" },
];

export default function MainLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-2 px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-heading font-semibold">
          <ListChecksIcon aria-hidden />
          URL Shortener
        </Link>
        <nav className="flex flex-wrap gap-1">
          {links.map(({ to, label }) => (
            <Button key={to} asChild variant={pathname === to ? "secondary" : "ghost"} size="sm">
              <Link to={to} aria-current={pathname === to ? "page" : undefined}>
                {label}
              </Link>
            </Button>
          ))}
        </nav>
      </header>
      <Separator />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Outlet />
      </main>
      <Toaster theme="dark" richColors />
    </div>
  );
}
