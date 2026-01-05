import { useQuery } from "@tanstack/react-query";
import { getMemberRoleFn } from "@/server/functions/auth";
import { isAtLeast, type Role } from "@/lib/permissions";

export type Permissions = {
  role: Role;
  isOwner: boolean;
  isAdmin: boolean;
  canAccessSettings: boolean;
  canAccessMembers: boolean;
  canAccessBilling: boolean;
  canEditAnyModel: boolean;
  canDeleteModels: boolean;
  canManageAdmins: boolean;
};

/**
 * Hook to get current user's permissions for UI conditional rendering.
 *
 * Use this to:
 * - Hide/show navigation links (settings, members, billing)
 * - Control model edit/delete buttons visibility
 * - Control role management options (owner-only admin management)
 */
export function usePermissions() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const result = await getMemberRoleFn();
      if (!result) {
        return null;
      }

      const role = result.role as Role;

      return {
        role,
        isOwner: role === "owner",
        isAdmin: isAtLeast(role, "admin"),
        canAccessSettings: isAtLeast(role, "admin"),
        canAccessMembers: isAtLeast(role, "admin"),
        canAccessBilling: role === "owner",
        canEditAnyModel: isAtLeast(role, "admin"),
        canDeleteModels: isAtLeast(role, "admin"),
        canManageAdmins: role === "owner",
      } satisfies Permissions;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - role changes take effect next session anyway
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    permissions: data ?? null,
    isLoading,
    error,
  };
}

/**
 * Check if user can edit a specific model.
 * - Admins/owners can edit ANY model
 * - Members can only edit their OWN models
 */
export function canEditModel(
  permissions: Permissions | null,
  modelOwnerId: string,
  currentUserId: string | undefined,
): boolean {
  if (!permissions || !currentUserId) return false;

  // Admins and owners can edit any model
  if (permissions.canEditAnyModel) return true;

  // Members can only edit their own models
  return modelOwnerId === currentUserId;
}

/**
 * Check if user can delete a specific model.
 * Only admins and owners can delete models.
 */
export function canDeleteModel(permissions: Permissions | null): boolean {
  return permissions?.canDeleteModels ?? false;
}
