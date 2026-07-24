import type { Metadata } from "next";
import { NewRequestForm } from "@/components/app/NewRequestForm";

export const metadata: Metadata = { title: "Új értékeléskérés" };

export default function Page() {
  return <NewRequestForm />;
}
