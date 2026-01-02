import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Shield, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useActiveOrganization } from "@/hooks/use-organizations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GradientAvatar } from "@/components/ui/gradient-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Member = {
  id: string;
  userId: string;
  role: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
};

const ROLES = [
  { value: "owner", label: "Owner", icon: Crown, description: "Full access" },
  { value: "admin", label: "Admin", icon: Shield, description: "Can manage members" },
  { value: "member", label: "Member", icon: User, description: "Standard access" },
] as const;

function getRoleConfig(role: string) {
  return ROLES.find((r) => r.value === role) ?? ROLES[2];
}

type MembersTableProps = {
  memberLimit: number;
};

export function MembersTable({ memberLimit }: MembersTableProps) {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const { data: activeOrg } = useActiveOrganization();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ["organization", activeOrg?.id, "members"],
    queryFn: async () => {
      if (!activeOrg) return [];
      const result = await authClient.organization.listMembers({
        query: { organizationId: activeOrg.id },
      });
      // Response is { data: { members: Member[], total: number }, error: null }
      const data = result.data as { members: Member[]; total: number } | null;
      return data?.members ?? [];
    },
    enabled: !!activeOrg,
  });

  const currentUserId = session?.user?.id;
  const memberCount = members?.length ?? 0;

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!activeOrg) return;
    setIsUpdating(memberId);

    await authClient.organization.updateMemberRole(
      {
        organizationId: activeOrg.id,
        memberId,
        role: newRole,
      },
      {
        onSuccess: async () => {
          toast.success("Member role updated");
          await queryClient.invalidateQueries({
            queryKey: ["organization", activeOrg.id, "members"],
          });
          setIsUpdating(null);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message ?? "Failed to update member role");
          setIsUpdating(null);
        },
      }
    );
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string, memberName: string) => {
    if (!activeOrg) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from the organization?`)) {
      return;
    }
    setIsRemoving(memberId);

    await authClient.organization.removeMember(
      {
        organizationId: activeOrg.id,
        memberIdOrEmail: memberEmail,
      },
      {
        onSuccess: async () => {
          toast.success("Member removed");
          await queryClient.invalidateQueries({
            queryKey: ["organization", activeOrg.id, "members"],
          });
          setIsRemoving(null);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message ?? "Failed to remove member");
          setIsRemoving(null);
        },
      }
    );
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              People who have access to this organization
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {memberCount}/{memberLimit} members
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.map((member) => {
              const roleConfig = getRoleConfig(member.role);
              const isCurrentUser = member.userId === currentUserId;
              const isOwner = member.role === "owner";
              const RoleIcon = roleConfig.icon;

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <GradientAvatar
                        id={member.userId}
                        name={member.user.name ?? member.user.email}
                        size="sm"
                        src={member.user.image}
                      />
                      <div>
                        <p className="font-medium text-sm">
                          {member.user.name ?? "No name"}
                          {isCurrentUser && (
                            <span className="ml-2 text-muted-foreground text-xs">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isOwner ? (
                      <Badge className="gap-1" variant="default">
                        <Crown className="h-3 w-3" />
                        Owner
                      </Badge>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            className="h-7 gap-1"
                            disabled={isUpdating === member.id}
                            size="sm"
                            variant="outline"
                          >
                            {isUpdating === member.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RoleIcon className="h-3 w-3" />
                            )}
                            {roleConfig.label}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {ROLES.filter((r) => r.value !== "owner").map(
                            (role) => (
                              <DropdownMenuItem
                                key={role.value}
                                onClick={() =>
                                  handleRoleChange(member.id, role.value)
                                }
                              >
                                <role.icon className="mr-2 h-4 w-4" />
                                <div>
                                  <p className="font-medium">{role.label}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {role.description}
                                  </p>
                                </div>
                              </DropdownMenuItem>
                            )
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isOwner && !isCurrentUser && (
                      <Button
                        disabled={isRemoving === member.id}
                        onClick={() =>
                          handleRemoveMember(
                            member.id,
                            member.user.email,
                            member.user.name ?? member.user.email
                          )
                        }
                        size="icon"
                        variant="ghost"
                      >
                        {isRemoving === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
