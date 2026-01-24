import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { WhoItsForSection } from "@/components/landing/WhoItsForSection";
import { ProjectStatusSection } from "@/components/landing/ProjectStatusSection";
import { TechStackSection } from "@/components/landing/TechStackSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <HeroSection />
            <HowItWorksSection />
            <WhoItsForSection />
            <ProjectStatusSection />
            <TechStackSection />
            <LandingFooter />
        </main>
    );
}
