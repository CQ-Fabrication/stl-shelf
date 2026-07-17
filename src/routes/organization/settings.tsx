import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Settings, Tags } from "lucide-react";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationSettingsForm } from "@/components/organization/settings-form";
import { TagManager } from "@/components/organization/tag-manager";
import { useOpenPanelClient } from "@/lib/openpanel/client-provider";
import { trackTagManagerOpened } from "@/lib/openpanel/client-events";
import { getMemberRoleFn } from "@/server/functions/auth";

export const Route = createFileRoute("/organization/settings")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  validateSearch: z.object({
    tab: z.enum(["general", "tags"]).optional(),
    src: z.enum(["menu"]).optional(),
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

  // This route component stays mounted across tab switches (TagManager itself
  // remounts per tab activation, so a ref there wouldn't survive). Fire the
  // "opened" event once per visit, the first time the Tags tab is active.
  const hasTrackedOpenRef = useRef(false);
  const initialTabRef = useRef(tab);

  useEffect(() => {
    if (hasTrackedOpenRef.current || !client || tab !== "tags") return;

    const source = src === "menu" ? "menu" : initialTabRef.current === "tags" ? "deeplink" : "tab";
    trackTagManagerOpened(client, { source });
    hasTrackedOpenRef.current = true;

    // Strip the attribution param so a refresh/back doesn't re-report "menu".
    if (src === "menu") {
      navigate({ search: { tab: "tags" }, replace: true });
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
            search: { tab: value === "general" ? undefined : (value as "tags") },
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
