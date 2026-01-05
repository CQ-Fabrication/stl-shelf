import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useConsentStatus } from "@/hooks/use-consent-status";
import { generateFingerprint } from "@/lib/fingerprint";
import { reacceptConsentFn } from "@/server/functions/consent";

/**
 * Blocking consent banner that appears when terms have been updated.
 * User must re-accept before continuing to use the application.
 */
export function ConsentBanner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoading, isValid, reason, currentVersion, marketingAccepted } = useConsentStatus();

  const [termsAccepted, setTermsAccepted] = useState(false);
  // Initialize to undefined, then sync with server value once loaded
  const [marketingChecked, setMarketingChecked] = useState<boolean | undefined>(undefined);

  // Sync marketing state when server value becomes available
  // Only sync once - don't override user's changes after initial load
  useEffect(() => {
    if (marketingAccepted !== undefined && marketingChecked === undefined) {
      setMarketingChecked(marketingAccepted);
    }
  }, [marketingAccepted, marketingChecked]);

  const reaccept = useMutation({
    mutationFn: async () => {
      if (!currentVersion) {
        throw new Error("No document version available");
      }

      const fingerprint = await generateFingerprint();

      return reacceptConsentFn({
        data: {
          termsPrivacyVersion: currentVersion,
          marketingAccepted: marketingChecked ?? false,
          fingerprint,
        },
      });
    },
    onSuccess: () => {
      toast.success("Thank you for accepting our updated terms");
      queryClient.invalidateQueries({ queryKey: ["consent-validity"] });
      queryClient.invalidateQueries({ queryKey: ["consent-status"] });
      router.invalidate();
    },
    onError: () => {
      toast.error("Failed to record your acceptance. Please try again.");
    },
  });

  // Don't show if loading, valid, or not an outdated consent issue
  if (isLoading || isValid || reason !== "outdated") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-lg mx-4">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-semibold text-xl">Our Terms Have Been Updated</h2>
          <p className="text-muted-foreground text-sm">
            We've made updates to our Terms of Service and Privacy Policy. Please review and accept
            the updated terms to continue using STL Shelf.
          </p>
        </div>

        {/* Checkboxes */}
        <div className="space-y-4">
          {/* Terms & Privacy - Required */}
          <div className="flex items-start gap-3 rounded-md border p-4">
            <Checkbox
              checked={termsAccepted}
              id="reaccept-terms"
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
            />
            <div className="space-y-1">
              <Label className="font-medium cursor-pointer" htmlFor="reaccept-terms">
                I accept the updated Terms and Privacy Policy
                <sup className="ml-0.5 text-red-600">*</sup>
              </Label>
              <div className="flex gap-3 text-sm">
                <Link
                  className="text-primary underline hover:no-underline"
                  onClick={(e) => e.stopPropagation()}
                  target="_blank"
                  to="/terms"
                >
                  View Terms
                </Link>
                <Link
                  className="text-primary underline hover:no-underline"
                  onClick={(e) => e.stopPropagation()}
                  target="_blank"
                  to="/privacy"
                >
                  View Privacy Policy
                </Link>
              </div>
            </div>
          </div>

          {/* Marketing - Optional, pre-checked if previously accepted */}
          <div className="flex items-start gap-3 rounded-md border p-4">
            <Checkbox
              checked={marketingChecked ?? false}
              id="reaccept-marketing"
              onCheckedChange={(checked) => setMarketingChecked(checked === true)}
            />
            <Label className="font-normal cursor-pointer" htmlFor="reaccept-marketing">
              Keep me updated about STL Shelf (optional)
              {marketingAccepted && (
                <span className="ml-1 text-muted-foreground text-xs">(previously accepted)</span>
              )}
            </Label>
          </div>
        </div>

        {/* Submit */}
        <Button
          className="w-full"
          disabled={!termsAccepted || reaccept.isPending}
          onClick={() => reaccept.mutate()}
        >
          {reaccept.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
