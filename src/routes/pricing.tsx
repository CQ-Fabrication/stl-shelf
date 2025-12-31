import { createFileRoute } from '@tanstack/react-router'
import { Navigation } from '@/components/marketing/navigation'
import { Pricing as PricingSection } from '@/components/marketing/sections/pricing'
import { Footer } from '@/components/marketing/sections'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: 'Pricing - STL Shelf' },
      {
        name: 'description',
        content:
          'Simple, transparent pricing for STL Shelf. Start free, upgrade when you need more.',
      },
    ],
  }),
})

function PricingPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-16">
        <PricingSection />
        <Footer />
      </main>
    </>
  )
}
