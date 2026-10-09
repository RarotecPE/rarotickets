"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowUpRight, LogOut, Ticket, UserCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ParticipantAuthProvider,
  useParticipantAuth,
} from "@/components/participant-auth-provider";
import { btnPrimary, btnSecondary } from "@/components/ui";

export type PublicShellProps = { children: ReactNode };

export function PublicShell({ children }: PublicShellProps) {
  return (
    <ParticipantAuthProvider>
      <div className="min-h-screen bg-app-background text-app-foreground">
        <PublicHeader />
        <main>{children}</main>
        <footer className="border-t border-app-border bg-app-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-app-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>
              © {new Date().getFullYear()} RaroTickets · Gestão de eventos e
              inscrições
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/eventos" className="hover:text-app-foreground">
                Eventos
              </Link>
              <Link href="/login" className="hover:text-app-foreground">
                Acesso da equipe
              </Link>
              <a
                href="https://www.rarotec.com.br"
                target="_blank"
                rel="noreferrer"
                className="hover:text-app-foreground"
              >
                Fale conosco
              </a>
            </div>
          </div>
        </footer>
      </div>
    </ParticipantAuthProvider>
  );
}

function PublicHeader() {
  const { participant, isAuthenticated, isLoading, logout } = useParticipantAuth();

  const firstName = participant?.name ? participant.name.split(" ")[0] : null;

  return (
    <header className="sticky top-0 z-30 border-b border-app-border bg-app-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
          aria-label="RaroTickets, página inicial"
        >
          <Image
            src="/rarotickets-mark.svg"
            width={36}
            height={36}
            alt=""
            priority
            className="h-9 w-9 shrink-0 rounded-app-md"
          />
          <span className="truncate text-lg font-bold tracking-tight text-app-foreground">
            Raro<span className="text-app-primary">Tickets</span>
          </span>
        </Link>

        <nav
          className="flex shrink-0 items-center gap-2 sm:gap-3"
          aria-label="Navegação principal"
        >
          <Link
            href="/eventos"
            className="hidden h-9 items-center rounded-app-md px-3 text-sm font-semibold text-app-muted-foreground hover:bg-app-surface-elevated hover:text-app-foreground sm:inline-flex"
          >
            Explorar eventos
          </Link>

          {!isLoading && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/participante"
                    className={`${btnSecondary} h-9 gap-1.5 px-3 text-xs sm:text-sm`}
                    title="Acessar meu painel de participante"
                  >
                    <UserCheck className="h-4 w-4 text-app-primary" aria-hidden="true" />
                    <span>Meu Painel{firstName ? ` (${firstName})` : ""}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-app-md text-app-muted-foreground hover:bg-app-surface-elevated hover:text-app-danger"
                    title="Sair da conta"
                    aria-label="Sair da conta"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/participante/login"
                    className="inline-flex h-9 items-center rounded-app-md px-2.5 text-xs font-semibold text-app-muted-foreground hover:bg-app-surface-elevated hover:text-app-foreground sm:px-3 sm:text-sm"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/participante/cadastro"
                    className={`${btnPrimary} h-9 px-3 text-xs sm:text-sm`}
                  >
                    Cadastre-se
                  </Link>
                </div>
              )}
            </>
          )}

          <ThemeToggle />

          <Link
            href="/eventos"
            aria-label="Explorar eventos"
            className={`${btnPrimary} h-9 px-3 sm:hidden`}
          >
            <Ticket className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Explorar eventos</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
