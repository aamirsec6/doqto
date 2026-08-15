import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CompliancePage } from "@/components/compliance/CompliancePage";

export const metadata: Metadata = {
  title: "Compliance · DOQTO",
  description:
    "DOQTO’s health-tech compliance posture — DPDP-ready design, NABH/JCI-style audit-log support, and honest limits on what we claim.",
};

export default function ComplianceRoute() {
  return (
    <>
      <Header />
      <CompliancePage />
      <Footer />
    </>
  );
}
