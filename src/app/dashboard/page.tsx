import type { Metadata } from "next";
import { DashboardApp } from "@/components/dashboard/DashboardView";
import { RequireTenant } from "@/components/tenant/RequireTenant";

export const metadata: Metadata = {
  title: "Digital twin · DOQTO",
  description:
    "Realtime ward digital twin — map your layout, then monitor beds, staff, assets, and alerts.",
};

export default function DashboardPage() {
  return (
    <RequireTenant redirectTo="/dashboard">
      <DashboardApp />
    </RequireTenant>
  );
}
