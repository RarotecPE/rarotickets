import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RaroTickets — Eventos e inscrições", template: "%s · RaroTickets" },
  description: "Explore eventos, faça sua inscrição e acompanhe seus ingressos pelo RaroTickets.",
  icons: { icon: [{ url: "/rarotickets-mark.svg", type: "image/svg+xml" }], shortcut: "/rarotickets-mark.svg" },
};
export const viewport: Viewport = { themeColor: "#f5f7fb", width: "device-width", initialScale: 1 };

export type RootLayoutProps = { children: ReactNode };
export default function RootLayout({ children }: RootLayoutProps) {
  return <html lang="pt-BR" className="theme-light h-full antialiased" suppressHydrationWarning><body className="theme-light min-h-screen bg-app-background font-sans text-app-foreground antialiased">{children}</body></html>;
}
