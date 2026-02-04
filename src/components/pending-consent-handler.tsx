import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { clearPendingConsent, getPendingConsent } from "@/lib/pending-consent";
import { submitConsentFn } from "@/server/functions/consent";
import { authClient } from "@/lib/auth-client";

/**
 * Silently handles pending consent from magic link flow.
 * On mount, checks localStorage for pending consent and submits it.
 * This runs on protected routes after magic link authentication.
 */
export function PendingConsentHandler() {
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  const submitConsent = useMutation({
    mutationFn: async ({
      userId,
      email,
      termsPrivacyVersion,
      marketingAccepted,
      fingerprint,
    }: {
      userId: string;
      email: string;
      termsPrivacyVersion: string;
      marketingAccepted: boolean;
      fingerprint: string;
    }) => {
      return submitConsentFn({
        data: {
          userId,
          email,
          termsPrivacyAccepted: true,
          termsPrivacyVersion,
          marketingAccepted,
          fingerprint,
        },
      });
    },
  });

  useEffect(() => {
    // Only run once per mount
    if (hasRun.current) return;
    hasRun.current = true;

    const handlePendingConsent = async () => {
      // Check for pending consent from auth flows
      const pending = getPendingConsent();
      if (!pending) return;

      // Get current session
      const session = await authClient.getSession();
      if (!session?.data?.user?.id || !session.data.user.email) {
        return;
      }

      // Submit the pending consent
      try {
        await submitConsent.mutateAsync({
          userId: session.data.user.id,
          email: session.data.user.email,
          termsPrivacyVersion: pending.termsPrivacyVersion,
          marketingAccepted: pending.marketingAccepted,
          fingerprint: pending.fingerprint,
        });
        await queryClient.invalidateQueries({ queryKey: ["consent-validity"] });
        clearPendingConsent();
      } catch (error) {
        // Silently fail - the consent banner will catch outdated consent
        console.error("Failed to submit pending consent:", error);
      }
    };

    handlePendingConsent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
