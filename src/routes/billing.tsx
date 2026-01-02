import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { PlanSelector } from '@/components/billing/plan-selector'
import { SubscriptionStatusCard } from '@/components/billing/subscription-status-card'
import { UsageCard } from '@/components/billing/usage-card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/billing')({
  component: BillingPage,
})

function BillingPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Back Navigation */}
      <div className="mb-6">
        <Button
          asChild
          className="transition-colors hover:text-brand"
          size="sm"
          variant="ghost"
        >
          <Link to="/library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription, view usage, and upgrade your plan
        </p>
      </div>

      {/* Current Status & Usage */}
      <div className="mb-12 grid gap-8 lg:grid-cols-2">
        <SubscriptionStatusCard />
        <UsageCard />
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="mb-6 font-semibold text-2xl">Choose Your Plan</h2>
        <PlanSelector />
      </div>

      {/* FAQ or Additional Info */}
      <div className="mt-12 rounded-lg border p-6">
        <h3 className="mb-4 font-semibold text-lg">Need help?</h3>
        <p className="text-muted-foreground text-sm">
          Have questions about our plans? Contact support for personalized
          assistance.
        </p>
      </div>
    </div>
  )
}
