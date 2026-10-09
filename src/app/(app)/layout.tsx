import type { ReactNode } from "react";
import { AppShell } from "@/components/shell";

export type ProtectedLayoutProps = { children: ReactNode };
export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
