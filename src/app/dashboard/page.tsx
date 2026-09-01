import type { Metadata } from "next";
import { BoardApp } from "@/board/BoardApp";
import { RequireTenant } from "@/components/tenant/RequireTenant";

export const metadata: Metadata = {
  title: "Oncology board · DOQTO",
  description: "Live oncology department board.",
};

export default function DashboardPage() {
  return (
    <RequireTenant redirectTo="/dashboard">
      <BoardApp />
    </RequireTenant>
  );
}
