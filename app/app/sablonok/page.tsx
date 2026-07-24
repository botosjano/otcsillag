import type { Metadata } from "next";
import { TemplatesView } from "@/components/app/TemplatesView";
export const metadata: Metadata = { title: "Sablonok" };
export default function Page() {
  return <TemplatesView />;
}
