import { OrganizationSettingsCards } from "@daveyplate/better-auth-ui";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/organization/settings")({
  component: OrganizationSettingsPage,
});

function OrganizationSettingsPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Button
          asChild
          className="transition-colors hover:text-brand"
          size="sm"
          variant="ghost"
        >
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
      </div>
      <h1 className="mb-8 font-bold text-3xl">Organization Settings</h1>
      <div className="flex flex-col gap-6">
        <OrganizationSettingsCards />
      </div>
    </div>
  );
}
