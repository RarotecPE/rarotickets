import type { Metadata } from "next";
import { ReportsDashboard } from "@/components/reports-dashboard";

export const metadata: Metadata = { title: "Relatórios · RaroTickets" };

export default function ReportsPage() {
  return <ReportsDashboard />;
}
