import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, History, Settings, Tags } from "lucide-react";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationActivity } from "@/components/organization/activity-feed";
import { OrganizationSettingsForm } from "@/components/organization/settings-form";
import { TagManager } from "@/components/organization/tag-manager";
import { useOpenPanelClient } from "@/lib/openpanel/client-provider";
import { trackActivityViewed, trackTagManagerOpened } from "@/lib/openpanel/client-events";
import { getMemberRoleFn } from "@/server/functions/auth";

export const Route = createFileRoute("/organization/settings")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  validateSearch: z.object({
    tab: z.enum(["general", "tags", "activity"]).optional(),
    src: z.enum(["menu", "library"]).optional(),
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
  const { tab, src } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { client } = useOpenPanelClient();

  // This route component stays mounted across tab switches (the tab bodies
  // remount per activation, so a ref there wouldn't survive). Fire each tab's
  // "opened"/"viewed" event once per visit, the first time it becomes active.
  // The two guards are independent: a visit that opens both tabs fires both.
  const hasTrackedOpenRef = useRef(false);
  const hasTrackedActivityRef = useRef(false);
  const initialTabRef = useRef(tab);

  useEffect(() => {
    if (!client) return;

    if (!hasTrackedOpenRef.current && tab === "tags") {
      const source = src ?? (initialTabRef.current === "tags" ? "deeplink" : "tab");
      trackTagManagerOpened(client, { source });
      hasTrackedOpenRef.current = true;
    }

    if (!hasTrackedActivityRef.current && tab === "activity") {
      const source =
        src === "menu" ? "menu" : initialTabRef.current === "activity" ? "deeplink" : "tab";
      trackActivityViewed(client, { source });
      hasTrackedActivityRef.current = true;
    }

    // Strip the attribution param so a refresh/back doesn't re-report it.
    if (src && (tab === "tags" || tab === "activity")) {
      navigate({ search: { tab }, replace: true });
    }
  }, [tab, src, client, navigate]);

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

      <Tabs
        className="w-full"
        onValueChange={(value) =>
          navigate({
            search: { tab: value === "general" ? undefined : (value as "tags" | "activity") },
            replace: true,
          })
        }
        value={tab ?? "general"}
      >
        <TabsList className="mb-2 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="tags">
            <Tags className="mr-2 h-4 w-4" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="activity">
            <History className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <OrganizationSettingsForm />
        </TabsContent>

        <TabsContent value="tags">
          <TagManager />
        </TabsContent>

        <TabsContent value="activity">
          <OrganizationActivity />
        </TabsContent>
      </Tabs>
    </div>
  );
}
