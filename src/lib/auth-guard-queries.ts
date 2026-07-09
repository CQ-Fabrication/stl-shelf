import type { QueryClient } from "@tanstack/react-query";
import { getSessionFn, listOrganizationsFn } from "@/server/functions/auth";
import { checkConsentValidityFn } from "@/server/functions/consent";

// The root beforeLoad guard runs on every navigation. Reading these checks
// through react-query means repeat navigations resolve from cache instantly
// instead of paying 3 sequential server round-trips; `revalidateIfStale`
// refreshes stale entries in the background without blocking the transition.
const GUARD_STALE_TIME = 60 * 1000;

export const sessionGuardQueryOptions = () => ({
  queryKey: ["auth-guard", "session"] as const,
  queryFn: () => getSessionFn(),
  staleTime: GUARD_STALE_TIME,
  revalidateIfStale: true,
});

export const organizationsGuardQueryOptions = () => ({
  queryKey: ["auth-guard", "organizations"] as const,
  queryFn: () => listOrganizationsFn(),
  staleTime: GUARD_STALE_TIME,
  revalidateIfStale: true,
});

// Shares the ["consent-validity"] key with useConsentStatus so consent
// mutations that invalidate it also refresh the navigation guard.
export const consentGuardQueryOptions = () => ({
  queryKey: ["consent-validity"] as const,
  queryFn: () => checkConsentValidityFn(),
  staleTime: GUARD_STALE_TIME,
  revalidateIfStale: true,
});

// Call after auth state changes that happen without a full page load
// (sign-in, organization creation, invitation acceptance) so the guard
// re-checks on the next navigation instead of serving a stale verdict.
export function resetAuthGuardCache(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ["auth-guard"] });
  queryClient.removeQueries({ queryKey: ["consent-validity"] });
}
