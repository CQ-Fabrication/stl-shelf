import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PlanSelector } from "@/components/billing/plan-selector";
import { SubscriptionStatusCard } from "@/components/billing/subscription-status-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/billing")({
  component: BillingPage,
});

function BillingPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Back Navigation */}
      <div className="mb-6">
        <Button asChild className="transition-colors hover:text-brand" size="sm" variant="ghost">
          <Link to="/library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your plan and track usage</p>
      </div>

      {/* Current Status */}
      <div className="mb-12">
        <SubscriptionStatusCard />
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="mb-6 font-semibold text-2xl">Choose Your Plan</h2>
        <PlanSelector />
      </div>
    </div>
  );
}
