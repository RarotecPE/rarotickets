import type { Metadata } from "next";
import { RaffleTvDisplay } from "@/components/raffle-tv-display";

export const metadata: Metadata = {
  title: "Telão do Sorteio Ao Vivo · RaroTickets",
};

type RaffleTvPageProps = {
  params: Promise<{ token: string }>;
};

export default async function RaffleTvPage({ params }: RaffleTvPageProps) {
  const { token } = await params;
  return <RaffleTvDisplay token={token} />;
}
