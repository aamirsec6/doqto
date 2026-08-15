import type { Metadata } from "next";
import { StaffBoard } from "@/components/staff/StaffBoard";
import { RequireTenant } from "@/components/tenant/RequireTenant";

export const metadata: Metadata = {
  title: "My board · DOQTO",
  description:
    "Personal staff dashboard — see your pages, raise concerns, and reply on the hospital staff net.",
};

export default function StaffPage() {
  return (
    <RequireTenant redirectTo="/staff">
      <StaffBoard />
    </RequireTenant>
  );
}
