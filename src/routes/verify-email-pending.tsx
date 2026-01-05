import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";

const searchSchema = z.object({
  email: z.string().optional(),
});

export const Route = createFileRoute("/verify-email-pending")({
  validateSearch: searchSchema,
  component: VerifyEmailPendingPage,
});

function VerifyEmailPendingPage() {
  const { email } = useSearch({ from: "/verify-email-pending" });
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0) return;

    setIsResending(true);
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: `${window.location.origin}/library`,
      });
      toast.success("Verification email sent!");
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast.error("Failed to resend email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="grid place-items-center border-b">
          <Link to="/">
            <Logo aria-label="STL Shelf" className="h-10" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-6 text-center">
            <div
              aria-label="Email sent successfully"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
              role="img"
            >
              <svg
                aria-hidden="true"
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Verify your email</h3>
              <p className="text-muted-foreground text-sm">
                We've sent a verification link to{" "}
                {email ? (
                  <span className="font-medium text-foreground">{email}</span>
                ) : (
                  "your email address"
                )}
                . Click the link to activate your account.
              </p>
            </div>
          </div>

          {email && (
            <Button
              className="w-full"
              disabled={isResending || resendCooldown > 0}
              onClick={handleResendEmail}
              variant="outline"
            >
              {isResending
                ? "Sending..."
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend verification email"}
            </Button>
          )}

          <div className="text-center text-muted-foreground text-sm">
            Already verified?{" "}
            <Link className="underline underline-offset-4" to="/login">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
