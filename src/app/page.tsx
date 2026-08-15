import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { Solution } from "@/components/Solution";
import { DashboardLook } from "@/components/DashboardLook";
import { Research } from "@/components/Research";
import { Team } from "@/components/Team";
import { Mission } from "@/components/Mission";
import { Status } from "@/components/Status";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problem />
        <DashboardLook />
        <Solution />
        <Research />
        <Team />
        <Mission />
        <Status />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
