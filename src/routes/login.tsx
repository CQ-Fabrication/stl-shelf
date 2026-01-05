import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: LoginPage,
});

type LoginView = "magic-link" | "credentials";

function LoginPage() {
  const [view, setView] = useState<LoginView>("magic-link");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="grid place-items-center border-b">
          <Link to="/">
            <Logo aria-label="STL Shelf" className="h-10" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
          </div>

          {view === "magic-link" ? (
            <MagicLinkForm
              auth={authClient}
              magicLinkSent={magicLinkSent}
              onSuccess={() => setMagicLinkSent(true)}
            />
          ) : (
            <CredentialsForm auth={authClient} />
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">OR</span>
            </div>
          </div>

          {view === "magic-link" ? (
            <Button className="w-full" onClick={() => setView("credentials")} variant="outline">
              Sign in with password
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                setView("magic-link");
                setMagicLinkSent(false);
              }}
              variant="outline"
            >
              Sign in with magic link
            </Button>
          )}

          <div className="text-center text-muted-foreground text-sm">
            Don't have an account?{" "}
            <Link className="underline underline-offset-4" to="/signup">
              Create one
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
