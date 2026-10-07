import type { Metadata } from "next";
import { MockCheckout } from "@/components/mock-checkout";

type MockCheckoutSearchParams = { reference?: string };
type MockCheckoutPageProps = {
  searchParams: Promise<MockCheckoutSearchParams>;
};

export const metadata: Metadata = {
  title: "Checkout de demonstração · RaroTickets",
};

export default async function MockCheckoutPage({
  searchParams,
}: MockCheckoutPageProps) {
  const { reference = "" } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <MockCheckout referenceId={reference} />
    </div>
  );
}
