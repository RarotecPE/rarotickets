import type { Metadata } from "next";
import { CheckInConsole } from "@/components/checkin-console";

export const metadata: Metadata = { title: "Credenciamento · RaroTickets" };

export default function CheckInPage() {
  return <CheckInConsole />;
}
