/**
 * Role-Based Access Control (RBAC) permission helpers.
 *
 * Roles:
 * - owner: Full control, manages admins, billing
 * - admin: Org settings, team management (not admins), full model control
 * - member: View/download all, create, edit own metadata only
 */

export type Role = "owner" | "admin" | "member";

/**
 * Role hierarchy for permission comparisons.
 * Higher number = more permissions.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

/**
 * Check if a role has at least the required permission level.
 */
export function isAtLeast(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user can manage admin roles (promote/demote/remove admins).
 * Only owner can do this.
 */
export function canManageAdmins(role: Role): boolean {
  return role === "owner";
}

/**
 * Check if user can edit a model.
 * - Admins/owners can edit ANY model
 * - Members can only edit their OWN models (metadata only)
 */
export function canEditModel(role: Role, isOwnModel: boolean): boolean {
  return isAtLeast(role, "admin") || isOwnModel;
}

/**
 * Check if user can delete a model.
 * Only admins and owners can delete (members cannot delete even their own).
 */
export function canDeleteModel(role: Role): boolean {
  return isAtLeast(role, "admin");
}

/**
 * Check if user can access organization settings.
 */
export function canAccessOrgSettings(role: Role): boolean {
  return isAtLeast(role, "admin");
}

/**
 * Check if user can view/manage team members.
 */
export function canManageTeam(role: Role): boolean {
  return isAtLeast(role, "admin");
}

/**
 * Check if user can access billing (subscription, invoices).
 * Only owner can access billing.
 */
export function canAccessBilling(role: Role): boolean {
  return role === "owner";
}

/**
 * Check if actor can modify target's role.
 * - Owner can change anyone's role
 * - Admins can change members only (not other admins)
 * - Members cannot change roles
 */
export function canChangeRole(
  actorRole: Role,
  targetCurrentRole: Role,
  targetNewRole: Role,
): boolean {
  // Only owner can touch admin roles
  if (targetCurrentRole === "admin" || targetNewRole === "admin") {
    return actorRole === "owner";
  }

  // Admins can change member roles
  return isAtLeast(actorRole, "admin");
}

/**
 * Check if actor can remove target from organization.
 * - Owner can remove anyone
 * - Admins can remove members only (not other admins)
 * - Members cannot remove anyone
 */
export function canRemoveMember(actorRole: Role, targetRole: Role): boolean {
  // Owner can remove anyone
  if (actorRole === "owner") {
    return true;
  }

  // Admins can only remove members
  if (actorRole === "admin" && targetRole === "member") {
    return true;
  }

  return false;
}
