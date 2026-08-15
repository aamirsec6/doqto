import type { Metadata } from "next";
import { AdminConsole } from "@/components/dashboard/AdminConsole";

export const metadata: Metadata = {
  title: "Admin · DOQTO",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
