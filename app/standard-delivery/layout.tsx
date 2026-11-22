import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Standard Delivery & Customer Reviews | JuiceWala",
  description:
    "Safe packaging directly from seller to customer across Bhiwani, delivered not in fragile bottles. Read verified customer reviews.",
};

export default function StandardDeliveryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
