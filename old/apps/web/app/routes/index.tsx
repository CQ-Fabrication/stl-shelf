import { createFileRoute } from "@tanstack/react-router"
import { Navigation } from "~/components/navigation"
import {
  FeaturesBento,
  FinalCTA,
  Footer,
  HeroSection,
  HowItWorks,
  Pricing,
  Testimonials,
  TextRevealSection,
  UseCases,
} from "~/components/sections"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <HeroSection />
        <TextRevealSection />
        <FeaturesBento />
        <HowItWorks />
        <UseCases />
        <Pricing />
        <Testimonials />
        <FinalCTA />
        <Footer />
      </main>
    </>
  )
}
