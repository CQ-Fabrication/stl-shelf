import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Check, CreditCard, LogOut, Plus, Settings, User } from "lucide-react";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useActiveOrganization, useOrganizations } from "@/hooks/use-organizations";
import { usePermissions } from "@/hooks/use-permissions";
import { uploadModalActions } from "@/stores/upload-modal.store";
import { AnnouncementDropdown } from "@/components/announcements/announcement-dropdown";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { GradientAvatar } from "@/components/ui/gradient-avatar";
import { Logo } from "@/components/ui/logo";

const UploadModal = lazy(() =>
  import("./models/upload-modal/upload-modal").then((mod) => ({
    default: mod.UploadModal,
  })),
);

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: session } = authClient.useSession();
  const { data: organizations, isPending: isLoadingOrgs } = useOrganizations();
  const { data: activeOrg } = useActiveOrganization();
  const { permissions } = usePermissions();

  async function switchOrganization(orgId: string) {
    try {
      await authClient.organization.setActive({ organizationId: orgId });
      const org = organizations?.find((o) => o.id === orgId);
      if (org) {
        toast.success(`Switched to ${org.name}`);
        await queryClient.invalidateQueries({ queryKey: ["organizations"] });
        await router.invalidate();
      }
    } catch (error) {
      console.error("Failed to switch organization:", error);
      toast.error("Failed to switch organization");
    }
  }

  const hasOrganizations = (organizations?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <Link aria-label="STL Shelf home" className="flex items-center" to="/">
          <Logo className="h-8" />
        </Link>
        <div className="flex items-center gap-2">
          {/* Upload button - Only show if user has organizations */}
          {hasOrganizations && (
            <Button onClick={() => uploadModalActions.openModal()} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {/* Announcements dropdown - Only show for authenticated users */}
          {session?.user && <AnnouncementDropdown />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="User menu" size="icon" variant="outline">
                {session?.user ? (
                  <GradientAvatar
                    className="h-[1.2rem] w-[1.2rem]"
                    id={session.user.id}
                    name={session.user.name ?? session.user.email}
                    size="xs"
                    src={session.user.image ?? undefined}
                  />
                ) : (
                  <User className="h-[1.2rem] w-[1.2rem]" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Organization Submenu - Only show if user has organizations */}
              {!isLoadingOrgs && hasOrganizations && activeOrg && (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2">
                      <GradientAvatar
                        className="h-4 w-4"
                        id={activeOrg.id}
                        name={activeOrg.name}
                        size="xs"
                        src={activeOrg.logo ?? undefined}
                      />
                      <span className="truncate">{activeOrg.name}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuLabel className="text-xs">Switch Organization</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {organizations?.map((org) => {
                        const isActive = org.id === activeOrg.id;
                        return (
                          <DropdownMenuItem
                            className={isActive ? "bg-accent" : ""}
                            disabled={isActive}
                            key={org.id}
                            onClick={() => !isActive && switchOrganization(org.id)}
                          >
                            <div className="flex w-full items-center gap-2">
                              <GradientAvatar
                                className="h-4 w-4 flex-shrink-0"
                                id={org.id}
                                name={org.name}
                                size="xs"
                                src={org.logo ?? undefined}
                              />
                              <span className="flex-1 truncate">{org.name}</span>
                              {isActive && <Check className="h-4 w-4 flex-shrink-0" />}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                      {/* RBAC: Only show settings for admins+ */}
                      {permissions?.canAccessSettings && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to="/organization/settings">
                              <Settings className="mr-2 h-4 w-4" />
                              Settings
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      {/* RBAC: Only show billing for owner */}
                      {permissions?.canAccessBilling && (
                        <DropdownMenuItem asChild>
                          <Link to="/billing">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Billing
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                </>
              )}
              <AnimatedThemeToggler showLabel />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await authClient.signOut();
                    queryClient.clear();
                    router.navigate({ to: "/login" });
                  } catch {
                    // ignore
                  }
                }}
                variant="destructive"
              >
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <hr />

      {/* Upload Modal */}
      <Suspense fallback={null}>
        <UploadModal />
      </Suspense>
    </div>
  );
}
