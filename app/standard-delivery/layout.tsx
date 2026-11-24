import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Standard Delivery & Customer Reviews | JuiceWala (juicewala)",
  description:
    "Direct safe packaging delivery from seller to customer across Bhiwani by JuiceWala (juicewala / juice wala / जूसवाला). Read verified Indian customer reviews.",
  keywords: [
    "juicewala delivery",
    "juice wala delivery",
    "juicewala customer reviews",
    "juicewala bhiwani reviews",
    "juice wala ratings",
  ],
};

export default function StandardDeliveryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
