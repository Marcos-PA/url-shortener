import { LinkIcon } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

export default function MainLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-2 px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-heading font-semibold">
          <LinkIcon aria-hidden />
          URL Shortener
        </Link>
      </header>
      <Separator />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Outlet />
      </main>
      <Toaster theme="dark" richColors />
    </div>
  );
}
