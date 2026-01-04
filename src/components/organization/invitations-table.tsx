import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, Loader2, Mail, RotateCw, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useActiveOrganization } from "@/hooks/use-organizations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InviteModal } from "./invite-modal";

type Invitation = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
};

type Member = {
  id: string;
  userId: string;
  role: string;
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isExpired(expiresAt: Date | string): boolean {
  return new Date(expiresAt) < new Date();
}

type InvitationsTableProps = {
  memberLimit: number;
};

export function InvitationsTable({ memberLimit }: InvitationsTableProps) {
  const queryClient = useQueryClient();
  const { data: activeOrg } = useActiveOrganization();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isResending, setIsResending] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState<string | null>(null);

  // Query REAL member count from the same source as MembersTable
  const { data: members } = useQuery({
    queryKey: ["organization", activeOrg?.id, "members"],
    queryFn: async () => {
      if (!activeOrg) return [];
      const result = await authClient.organization.listMembers({
        query: { organizationId: activeOrg.id },
      });
      const data = result.data as { members: Member[]; total: number } | null;
      return data?.members ?? [];
    },
    enabled: !!activeOrg,
  });

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["organization", activeOrg?.id, "invitations"],
    queryFn: async () => {
      if (!activeOrg) return [];
      const result = await authClient.organization.listInvitations({
        query: { organizationId: activeOrg.id },
      });
      const data = result.data as Invitation[] | { invitations: Invitation[] } | null;
      if (Array.isArray(data)) {
        return data;
      }
      if (data && "invitations" in data) {
        return data.invitations ?? [];
      }
      return [];
    },
    enabled: !!activeOrg,
  });

  // Use REAL member count from query
  const realMemberCount = members?.length ?? 0;
  const pendingInvitations = invitations?.filter((inv) => inv.status === "pending") ?? [];

  // BULLETPROOF limit check: real members + pending invitations >= limit
  const totalSlotsTaken = realMemberCount + pendingInvitations.length;
  const atLimit = totalSlotsTaken >= memberLimit;
  const slotsRemaining = Math.max(0, memberLimit - totalSlotsTaken);

  const handleResendInvitation = async (invitationId: string) => {
    if (!activeOrg) return;
    setIsResending(invitationId);

    const invitation = invitations?.find((inv) => inv.id === invitationId);
    if (!invitation) {
      setIsResending(null);
      return;
    }

    // Cancel old invitation first
    await authClient.organization.cancelInvitation(
      { invitationId },
      {
        onSuccess: async () => {
          // Then create new invitation
          const role = (invitation.role ?? "member") as "admin" | "member" | "owner";
          await authClient.organization.inviteMember(
            {
              organizationId: activeOrg.id,
              email: invitation.email,
              role,
            },
            {
              onSuccess: async () => {
                toast.success("Invitation resent");
                await queryClient.invalidateQueries({
                  queryKey: ["organization", activeOrg.id, "invitations"],
                });
                setIsResending(null);
              },
              onError: (ctx) => {
                const message = ctx.error.message ?? "Failed to resend invitation";
                if (message.includes("limit")) {
                  toast.error("Member limit reached. Upgrade your plan.");
                } else {
                  toast.error(message);
                }
                setIsResending(null);
              },
            },
          );
        },
        onError: (ctx) => {
          toast.error(ctx.error.message ?? "Failed to cancel old invitation");
          setIsResending(null);
        },
      },
    );
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setIsCanceling(invitationId);

    await authClient.organization.cancelInvitation(
      { invitationId },
      {
        onSuccess: async () => {
          toast.success("Invitation canceled");
          await queryClient.invalidateQueries({
            queryKey: ["organization", activeOrg?.id, "invitations"],
          });
          setIsCanceling(null);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message ?? "Failed to cancel invitation");
          setIsCanceling(null);
        },
      },
    );
  };

  const handleInviteSuccess = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["organization", activeOrg?.id, "invitations"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["organization", activeOrg?.id, "members"],
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Limit Warning Banner */}
      {atLimit && (
        <Alert className="items-center border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200 [&>svg]:translate-y-0 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between text-amber-800 dark:text-amber-200">
            <span>
              <strong>Member limit reached.</strong> You have {realMemberCount} member
              {realMemberCount !== 1 ? "s" : ""}
              {pendingInvitations.length > 0 && ` + ${pendingInvitations.length} pending`} (
              {totalSlotsTaken}/{memberLimit} slots used).
            </span>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="ml-4 shrink-0 border-amber-600 text-amber-700 hover:bg-amber-100 dark:border-amber-500 dark:text-amber-400 dark:hover:bg-amber-950"
            >
              <Link to="/billing">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className={atLimit ? "border-muted bg-muted/30 opacity-75" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={atLimit ? "text-muted-foreground" : ""}>
                Pending Invitations
              </CardTitle>
              <CardDescription>
                {pendingInvitations.length > 0
                  ? `${pendingInvitations.length} pending invitation${pendingInvitations.length > 1 ? "s" : ""}`
                  : "No pending invitations"}
                {!atLimit && slotsRemaining > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    ({slotsRemaining} slot{slotsRemaining !== 1 ? "s" : ""} remaining)
                  </span>
                )}
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={atLimit ? 0 : -1}>
                    <Button
                      disabled={atLimit}
                      onClick={() => setIsInviteModalOpen(true)}
                      size="sm"
                      className={atLimit ? "pointer-events-none opacity-50" : ""}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Invite Member
                    </Button>
                  </span>
                </TooltipTrigger>
                {atLimit && (
                  <TooltipContent side="left" className="max-w-xs">
                    <p>
                      Member limit reached ({totalSlotsTaken}/{memberLimit}). Upgrade your plan to
                      invite more members.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {pendingInvitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Mail className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">No pending invitations</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Invite team members to collaborate
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => {
                  const expired = isExpired(invitation.expiresAt);

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <span className="font-medium">{invitation.email}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{invitation.role ?? "member"}</Badge>
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge
                            className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            variant="secondary"
                          >
                            <Clock className="h-3 w-3" />
                            Expired
                          </Badge>
                        ) : (
                          <Badge
                            className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            variant="secondary"
                          >
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(invitation.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            disabled={isResending === invitation.id}
                            onClick={() => handleResendInvitation(invitation.id)}
                            size="icon"
                            title="Resend invitation"
                            variant="ghost"
                          >
                            {isResending === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            disabled={isCanceling === invitation.id}
                            onClick={() => handleCancelInvitation(invitation.id)}
                            size="icon"
                            title="Cancel invitation"
                            variant="ghost"
                          >
                            {isCanceling === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteModal
        onOpenChange={setIsInviteModalOpen}
        onSuccess={handleInviteSuccess}
        open={isInviteModalOpen}
      />
    </>
  );
}
