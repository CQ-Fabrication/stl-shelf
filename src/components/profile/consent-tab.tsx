import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle, ExternalLink, FileText, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getConsentStatusFn, updateMarketingConsentFn } from "@/server/functions/consent";

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Not recorded";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConsentTab() {
  const queryClient = useQueryClient();

  const { data: consentStatus, isLoading } = useQuery({
    queryKey: ["consent-status"],
    queryFn: () => getConsentStatusFn(),
  });

  // Local state for marketing toggle, synced with server value
  const [marketingEnabled, setMarketingEnabled] = useState<boolean | undefined>(undefined);

  // Sync local state with server value when it loads
  const serverMarketingValue = consentStatus?.consent?.marketingAccepted;
  useEffect(() => {
    if (serverMarketingValue !== undefined && marketingEnabled === undefined) {
      setMarketingEnabled(serverMarketingValue);
    }
  }, [serverMarketingValue, marketingEnabled]);

  const updateMarketing = useMutation({
    mutationFn: (marketingAccepted: boolean) =>
      updateMarketingConsentFn({ data: { marketingAccepted } }),
    onMutate: (marketingAccepted) => {
      // Optimistic update
      setMarketingEnabled(marketingAccepted);
    },
    onSuccess: (_, marketingAccepted) => {
      queryClient.invalidateQueries({ queryKey: ["consent-status"] });
      toast.success(
        marketingAccepted
          ? "Marketing communications enabled"
          : "Marketing communications disabled",
      );
    },
    onError: () => {
      // Revert to server value on error
      setMarketingEnabled(serverMarketingValue);
      toast.error("Failed to update preference. Please try again.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const consent = consentStatus?.consent;

  return (
    <div className="flex flex-col gap-6">
      {/* Terms & Privacy Status */}
      <Card>
        <CardHeader>
          <CardTitle>Legal Documents</CardTitle>
          <CardDescription>
            Your acceptance of our Terms of Service and Privacy Policy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {consent?.termsPrivacyAccepted ? (
            <div className="flex items-start gap-3 rounded-md border bg-muted/50 p-4">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">Terms & Privacy Policy Accepted</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Accepted on {formatDate(consent.termsPrivacyAcceptedAt)}
                </p>
                {consent.termsPrivacyVersion && (
                  <p className="text-muted-foreground text-xs">
                    Version: {consent.termsPrivacyVersion}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-50/10 p-4">
              <p className="font-medium text-sm text-yellow-600">
                Terms & Privacy Policy not yet accepted
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                Please accept our terms to continue using the service.
              </p>
            </div>
          )}

          {/* Document Links */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline"
              target="_blank"
              to="/terms"
            >
              <FileText className="h-4 w-4" />
              View Terms of Service
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline"
              target="_blank"
              to="/privacy"
            >
              <FileText className="h-4 w-4" />
              View Privacy Policy
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Marketing Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Communications</CardTitle>
          <CardDescription>
            Control whether you receive product updates and announcements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <Label className="font-medium text-sm" htmlFor="marketing-toggle">
                  Email Updates
                </Label>
                <p className="text-muted-foreground text-sm">
                  Receive occasional emails about new features, tips, and product updates.
                </p>
              </div>
            </div>
            <Switch
              checked={marketingEnabled ?? false}
              disabled={updateMarketing.isPending}
              id="marketing-toggle"
              onCheckedChange={(checked: boolean) => updateMarketing.mutate(checked)}
            />
          </div>
          {consent?.marketingUpdatedAt && (
            <p className="mt-2 text-muted-foreground text-xs">
              Last updated: {formatDate(consent.marketingUpdatedAt)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
