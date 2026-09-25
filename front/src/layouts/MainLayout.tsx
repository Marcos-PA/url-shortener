import { LinkIcon, LogInIcon, LogOutIcon } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";

export default function MainLayout() {
  const { user, ready, logout } = useAuth();

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-2 px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-heading font-semibold">
          <LinkIcon aria-hidden />
          URL Shortener
        </Link>
        {ready &&
          (user ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOutIcon data-icon="inline-start" />
                Log out
              </Button>
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">
                <LogInIcon data-icon="inline-start" />
                Log in
              </Link>
            </Button>
          ))}
      </header>
      <Separator />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        {/* Wait for a saved session to be checked (instant without one), so the page never mounts as the
            wrong user and loses what was typed. Remount it on login/logout so it reloads that user's data. */}
        {ready ? (
          <Outlet key={user?.id ?? "anonymous"} />
        ) : (
          <div className="flex justify-center py-10" aria-busy="true">
            <Spinner />
          </div>
        )}
      </main>
      <Toaster theme="dark" richColors />
    </div>
  );
}
