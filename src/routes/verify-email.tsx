import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || "",
    };
  },
});

type VerificationState = "pending" | "verifying" | "success" | "error";

const SUCCESS_REDIRECT_DELAY_MS = 2000;

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<VerificationState>(token ? "verifying" : "pending");
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();

  const verifyEmail = useCallback(
    async (verificationToken: string) => {
      try {
        await authClient.verifyEmail({
          query: { token: verificationToken },
        });
        setState("success");
        toast.success("Email verified successfully!");

        setTimeout(() => {
          navigate({ to: "/library" });
        }, SUCCESS_REDIRECT_DELAY_MS);
      } catch (_error) {
        setState("error");
        toast.error("Failed to verify email");
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (token && state === "verifying") {
      verifyEmail(token);
    }
  }, [token, state, verifyEmail]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { data: session } = await authClient.getSession();
      if (session?.user?.email) {
        await authClient.sendVerificationEmail({
          email: session.user.email,
          callbackURL: `${window.location.origin}/verify-email`,
        });
        toast.success("Verification email sent!");
      } else {
        toast.error("Please sign in to resend verification email");
      }
    } catch (_error) {
      toast.error("Failed to send verification email");
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
          {state === "pending" && (
            <PendingState isResending={isResending} onResend={handleResend} />
          )}
          {state === "verifying" && <VerifyingState />}
          {state === "success" && <SuccessState />}
          {state === "error" && <ErrorState isResending={isResending} onResend={handleResend} />}
        </CardContent>
      </Card>
    </div>
  );
}

function PendingState({ onResend, isResending }: { onResend: () => void; isResending: boolean }) {
  return (
    <>
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <svg
            aria-hidden="true"
            className="h-6 w-6 text-blue-600"
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
          <h3 className="font-semibold text-lg">Check your email</h3>
          <p className="text-muted-foreground text-sm">
            We've sent a verification link to your email address. Click the link to verify your
            account.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Didn't receive the email? </span>
        </div>
        <Button className="w-full" disabled={isResending} onClick={onResend} variant="outline">
          {isResending ? "Resending..." : "Resend verification email"}
        </Button>
        <Link to="/login">
          <Button className="w-full" variant="ghost">
            Back to login
          </Button>
        </Link>
      </div>
    </>
  );
}

function VerifyingState() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Verifying your email...</h3>
        <p className="text-muted-foreground text-sm">Please wait a moment.</p>
      </div>
    </div>
  );
}

function SuccessState() {
  return (
    <>
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            aria-hidden="true"
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Email verified!</h3>
          <p className="text-muted-foreground text-sm">
            Your email has been verified successfully. Redirecting you to the app...
          </p>
        </div>
      </div>

      <Link to="/library">
        <Button className="w-full">Go to app</Button>
      </Link>
    </>
  );
}

function ErrorState({ onResend, isResending }: { onResend: () => void; isResending: boolean }) {
  return (
    <>
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            aria-hidden="true"
            className="h-6 w-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Verification failed</h3>
          <p className="text-muted-foreground text-sm">
            This verification link is invalid or has expired. Please request a new one.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Button className="w-full" disabled={isResending} onClick={onResend}>
          {isResending ? "Resending..." : "Request new verification email"}
        </Button>
        <Link to="/login">
          <Button className="w-full" variant="outline">
            Back to login
          </Button>
        </Link>
      </div>
    </>
  );
}
