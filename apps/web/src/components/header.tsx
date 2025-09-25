import { Link, useRouter } from "@tanstack/react-router";
import {
  Building2,
  Check,
  Laptop,
  LogOut,
  Moon,
  Plus,
  Sun,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { RouterAppContext } from "@/routes/__root";
import { Logo } from "./logo";
import { useTheme } from "./theme-provider";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
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
} from "./ui/dropdown-menu";

export default function Header() {
  const router = useRouter();
  const { auth } = router.options.context as RouterAppContext;
  const { setTheme } = useTheme();

  const [showLimitAlert, setShowLimitAlert] = useState(false);

  const { data: organizations, isPending: isLoadingOrgs } =
    auth.useListOrganizations();
  const { data: activeOrg } = auth.useActiveOrganization();

  async function switchOrganization(orgId: string) {
    try {
      await auth.organization.setActive({ organizationId: orgId });
      const org = organizations?.find((o) => o.id === orgId);
      if (org) {
        toast.success(`Switched to ${org.name}`);
        await router.invalidate();
      }
    } catch (error) {
      console.error("Failed to switch organization:", error);
      toast.error("Failed to switch organization");
    }
  }

  function handleCreateOrganization() {
    // currently 1 organization per user
    setShowLimitAlert(true);
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
            <Button
              asChild
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              size="sm"
            >
              <Link to="/upload">
                <Plus className="mr-2 h-4 w-4" />
                Upload
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="User menu" size="icon" variant="outline">
                <User className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              {/* Organization Submenu - Only show if user has organizations */}
              {!isLoadingOrgs && hasOrganizations && activeOrg && (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2">
                      {activeOrg.logo ? (
                        <img
                          alt=""
                          className="h-4 w-4 rounded-full object-cover"
                          height={16}
                          src={activeOrg.logo}
                          width={16}
                        />
                      ) : (
                        <Building2 className="h-4 w-4" />
                      )}
                      <span className="truncate">{activeOrg.name}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuLabel className="text-xs">
                        Switch Organization
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {organizations?.map((org) => {
                        const isActive = org.id === activeOrg.id;
                        return (
                          <DropdownMenuItem
                            className={isActive ? "bg-accent" : ""}
                            disabled={isActive}
                            key={org.id}
                            onClick={() =>
                              !isActive && switchOrganization(org.id)
                            }
                          >
                            <div className="flex w-full items-center gap-2">
                              {org.logo ? (
                                <img
                                  alt=""
                                  className="h-4 w-4 flex-shrink-0 rounded-full object-cover"
                                  height={16}
                                  src={org.logo}
                                  width={16}
                                />
                              ) : (
                                <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                                  <Building2 className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                              <span className="flex-1 truncate">
                                {org.name}
                              </span>
                              {isActive && (
                                <Check className="h-4 w-4 flex-shrink-0" />
                              )}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleCreateOrganization}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Organization
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sun /> Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Laptop /> System
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await auth.signOut();
                    await router.invalidate();
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

      {/* Organization Limit Alert */}
      <AlertDialog onOpenChange={setShowLimitAlert} open={showLimitAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Organization Limit Reached</AlertDialogTitle>
            <AlertDialogDescription>
              Currently, only one organization per user is supported. We're
              working hard to add more features including multiple organizations
              support, enhanced collaboration tools, and much more!
              <br />
              <br />
              Stay tuned for updates as we continue to improve STL Shelf.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setShowLimitAlert(false)}>Got it</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
