import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Settings, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationSettingsForm } from "@/components/organization/settings-form";
import { TagManager } from "@/components/organization/tag-manager";
import { getMemberRoleFn } from "@/server/functions/auth";

export const Route = createFileRoute("/organization/settings")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async () => {
    // RBAC: Only admins and owners can access settings
    const permissions = await getMemberRoleFn();
    if (!permissions?.canAccessSettings) {
      throw notFound();
    }
    return { permissions };
  },
  component: OrganizationSettingsPage,
});

function OrganizationSettingsPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Button asChild className="transition-colors hover:text-brand" size="sm" variant="ghost">
          <Link to="/library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
      </div>
      <h1 className="mb-8 font-bold text-3xl">Organization Settings</h1>

      <Tabs className="w-full" defaultValue="general">
        <TabsList className="mb-2 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="tags">
            <Tags className="mr-2 h-4 w-4" />
            Tags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <OrganizationSettingsForm />
        </TabsContent>

        <TabsContent value="tags">
          <TagManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
