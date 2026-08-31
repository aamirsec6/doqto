import type { Metadata } from "next";
import { DashboardApp } from "@/components/dashboard/DashboardView";
import { RequireTenant } from "@/components/tenant/RequireTenant";

export const metadata: Metadata = {
  title: "Oncology board · DOQTO",
  description: "Live oncology department board — all units, staff, beds, and alerts.",
};

export default function DashboardPage() {
  return (
    <RequireTenant redirectTo="/dashboard">
      <DashboardApp />
    </RequireTenant>
  );
}
