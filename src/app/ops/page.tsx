import type { Metadata } from "next";
import { OpsBoard } from "@/components/ops/OpsBoard";

export const metadata: Metadata = {
  title: "Hospital ops · DOQTO",
  description:
    "Same-tenant staff communication board — Code Blue, doctor needed, and hospital-wide paging.",
};

export default function OpsPage() {
  return <OpsBoard />;
}
