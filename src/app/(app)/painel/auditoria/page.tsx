import type { Metadata } from "next";
import { AuditLogBrowser } from "@/components/audit-log-browser";

export const metadata: Metadata = { title: "Auditoria · RaroTickets" };

export default function AuditPage() {
  return <AuditLogBrowser />;
}
