import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";

type AcceptStatus = "idle" | "processing" | "failed";

export const Route = createFileRoute("/accept-invitation")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  validateSearch: z.object({
    invitationId: z.string().optional(),
  }),
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { invitationId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [status, setStatus] = useState<AcceptStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!invitationId || !session?.user) {
      return;
    }

    let cancelled = false;
    const accept = async () => {
      setStatus("processing");
      try {
        const result = await authClient.organization.acceptInvitation({ invitationId });
        if (cancelled) return;

        if (result.error) {
          const message = result.error.message || "Unable to accept invitation";
          setStatus("failed");
          setErrorMessage(message);

          if (message.toLowerCase().includes("already")) {
            toast.info("Invitation already accepted");
            await navigate({ to: "/library" });
            return;
          }

          toast.error(message);
          return;
        }

        toast.success("Invitation accepted");
        await navigate({ to: "/library" });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Unable to accept invitation";
        setStatus("failed");
        setErrorMessage(message);
        toast.error(message);
      }
    };

    void accept();

    return () => {
      cancelled = true;
    };
  }, [invitationId, navigate, session?.user]);

  if (!invitationId) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="grid place-items-center border-b">
            <Link to="/">
              <Logo aria-label="STL Shelf" className="h-10" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 text-center">
            <CardTitle className="text-2xl">Invalid invitation link</CardTitle>
            <p className="text-muted-foreground text-sm">
              The invitation link is missing required information.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPending) {
    return <CenterCard description="Checking your session..." title="Accepting invitation" />;
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="grid place-items-center border-b">
            <Link to="/">
              <Logo aria-label="STL Shelf" className="h-10" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 text-center">
            <CardTitle className="text-2xl">Sign in to accept invitation</CardTitle>
            <p className="text-muted-foreground text-sm">
              Continue with your account or create a new one to join the organization.
            </p>
            <Button asChild className="w-full">
              <Link search={{ invitationId, view: "credentials" }} to="/login">
                Sign in with password
              </Link>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <Link search={{ invitationId }} to="/signup">
                Create account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <CenterCard
        description={
          errorMessage ?? "Unable to accept invitation. Try again from the invitation email."
        }
        title="Invitation could not be accepted"
      />
    );
  }

  return (
    <CenterCard
      description="Finalizing access to the organization..."
      title="Accepting invitation"
    />
  );
}

function CenterCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="grid place-items-center border-b">
          <Link to="/">
            <Logo aria-label="STL Shelf" className="h-10" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-3 pt-6 text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-muted-foreground text-sm">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
