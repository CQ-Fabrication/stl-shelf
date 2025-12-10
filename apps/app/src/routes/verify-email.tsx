import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@stl-shelf/ui/components/logo";
import { Button } from "@stl-shelf/ui/components/button";
import { Card, CardContent, CardHeader } from "@stl-shelf/ui/components/card";
import type { RouterAppContext } from "./__root";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || "",
    };
  },
});

type VerificationState = "pending" | "verifying" | "success" | "error";

function VerifyEmailPage() {
  const { auth } = Route.useRouteContext() as RouterAppContext;
  const { token } = Route.useSearch();
  const [state, setState] = useState<VerificationState>(
    token ? "verifying" : "pending"
  );
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();

  const verifyEmail = useCallback(
    async (verificationToken: string) => {
      try {
        await auth.verifyEmail({
          query: { token: verificationToken },
        });
        setState("success");
        toast.success("Email verified successfully!");

        // Redirect to home after successful verification
        setTimeout(() => {
          navigate({ to: "/" });
        }, 2000);
      } catch (_error) {
        setState("error");
        toast.error("Failed to verify email");
      }
    },
    [auth, navigate]
  );

  useEffect(() => {
    if (token && state === "verifying") {
      verifyEmail(token);
    }
  }, [token, state, verifyEmail]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { data: session } = await auth.getSession();
      if (session?.user?.email) {
        await auth.sendVerificationEmail({
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
          <Logo aria-label="STL Shelf" className="h-8" />
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {state === "pending" && (
            <PendingState onResend={handleResend} isResending={isResending} />
          )}
          {state === "verifying" && <VerifyingState />}
          {state === "success" && <SuccessState />}
          {state === "error" && (
            <ErrorState onResend={handleResend} isResending={isResending} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PendingState({
  onResend,
  isResending,
}: {
  onResend: () => void;
  isResending: boolean;
}) {
  return (
    <>
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <svg
            className="h-6 w-6 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <title>Mail icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Check your email</h3>
          <p className="text-muted-foreground text-sm">
            We've sent a verification link to your email address. Click the link
            to verify your account.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            Didn't receive the email?{" "}
          </span>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={onResend}
          disabled={isResending}
        >
          {isResending ? "Resending..." : "Resend verification email"}
        </Button>
        <Link to="/login">
          <Button variant="ghost" className="w-full">
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
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <title>Success icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Email verified!</h3>
          <p className="text-muted-foreground text-sm">
            Your email has been verified successfully. Redirecting you to the
            app...
          </p>
        </div>
      </div>

      <Link to="/">
        <Button className="w-full">Go to app</Button>
      </Link>
    </>
  );
}

function ErrorState({
  onResend,
  isResending,
}: {
  onResend: () => void;
  isResending: boolean;
}) {
  return (
    <>
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <title>Error icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Verification failed</h3>
          <p className="text-muted-foreground text-sm">
            This verification link is invalid or has expired. Please request a
            new one.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Button className="w-full" onClick={onResend} disabled={isResending}>
          {isResending ? "Resending..." : "Request new verification email"}
        </Button>
        <Link to="/login">
          <Button variant="outline" className="w-full">
            Back to login
          </Button>
        </Link>
      </div>
    </>
  );
}
