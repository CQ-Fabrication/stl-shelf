import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { InvitationsTable } from "@/components/organization/invitations-table";
import { MembersTable } from "@/components/organization/members-table";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/organization/members")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async () => {
    throw notFound();
  },
  component: OrganizationMembersPage,
});

function OrganizationMembersPage() {
  const { subscription, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="container mx-auto flex max-w-4xl items-center justify-center px-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const memberLimit = subscription?.memberLimit ?? 1;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Button asChild className="transition-colors hover:text-brand" size="sm" variant="ghost">
          <Link to="/library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
      </div>
      <h1 className="mb-8 font-bold text-3xl">Team Members</h1>
      <div className="flex flex-col gap-6">
        <MembersTable memberLimit={memberLimit} />
        <InvitationsTable memberLimit={memberLimit} />
      </div>
    </div>
  );
}
