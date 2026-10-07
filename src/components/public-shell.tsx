import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowUpRight, Ticket } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { btnPrimary, btnSecondary } from "@/components/ui";

export type PublicShellProps = { children: ReactNode };

export function PublicShell({ children }: PublicShellProps) {
  return <div className="min-h-screen bg-app-background text-app-foreground"><PublicHeader /><main>{children}</main><footer className="border-t border-app-border bg-app-surface"><div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-app-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p>© {new Date().getFullYear()} RaroTickets · Gestão de eventos e inscrições</p><div className="flex flex-wrap gap-4"><Link href="/eventos" className="hover:text-app-foreground">Eventos</Link><Link href="/login" className="hover:text-app-foreground">Acesso da equipe</Link><a href="mailto:contato@rarotickets.com.br" className="hover:text-app-foreground">Fale conosco</a></div></div></footer></div>;
}

function PublicHeader() {
  return <header className="sticky top-0 z-30 border-b border-app-border bg-app-surface/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="RaroTickets, página inicial"><Image src="/rarotickets-mark.svg" width={36} height={36} alt="" priority className="h-9 w-9 shrink-0 rounded-app-md" /><span className="truncate text-lg font-bold tracking-tight text-app-foreground">Raro<span className="text-app-primary">Tickets</span></span></Link><nav className="flex shrink-0 items-center gap-1.5 sm:gap-2" aria-label="Navegação principal"><Link href="/eventos" className="hidden h-10 items-center rounded-app-md px-3 text-sm font-semibold text-app-muted-foreground hover:bg-app-surface-elevated hover:text-app-foreground sm:inline-flex">Explorar eventos</Link><ThemeToggle /><Link href="/login" className={btnSecondary + " hidden sm:inline-flex"}>Acesso da equipe</Link><Link href="/eventos" aria-label="Explorar eventos" className={btnPrimary + " h-9 px-3 sm:hidden"}><Ticket className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Explorar eventos</span><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></nav></div></header>;
}
