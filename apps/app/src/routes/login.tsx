import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Logo } from "@stl-shelf/ui/components/logo";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@stl-shelf/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@stl-shelf/ui/components/card";
import { Input } from "@stl-shelf/ui/components/input";
import { Label } from "@stl-shelf/ui/components/label";
import type { RouterAppContext } from "./__root";

export const Route = createFileRoute("/login")({
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
          <Logo aria-label="STL Shelf" className="h-8" />
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
          </div>

          {view === "magic-link" ? (
            <MagicLinkForm
              onSuccess={() => setMagicLinkSent(true)}
              magicLinkSent={magicLinkSent}
            />
          ) : (
            <CredentialsForm />
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
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setView("credentials")}
            >
              Sign in with password
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setView("magic-link");
                setMagicLinkSent(false);
              }}
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

function MagicLinkForm({
  onSuccess,
  magicLinkSent,
}: {
  onSuccess: () => void;
  magicLinkSent: boolean;
}) {
  const { auth } = Route.useRouteContext() as RouterAppContext;

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await auth.signIn.magicLink({
          email: value.email,
          callbackURL: `${window.location.origin}/`,
        });
        onSuccess();
        toast.success("Check your email for a magic link");
      } catch (error) {
        const err = error as { error?: { message?: string } };
        toast.error(
          err.error?.message || "Failed to send magic link. Please try again."
        );
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Enter a valid email address"),
      }),
    },
  });

  if (magicLinkSent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
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
            We've sent a magic link to your email address. Click the link to
            sign in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field name="email">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              Email <sup className="-ml-1 text-red-600">*</sup>
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              value={field.state.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                field.handleChange(e.target.value)
              }
              onBlur={field.handleBlur}
            />
            {!field.state.meta.isValid && (
              <div className="text-red-600 text-sm">
                {field.state.meta.errors
                  .flatMap((error) => error?.message)
                  .join(", ")}
              </div>
            )}
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send magic link"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

function CredentialsForm() {
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext() as RouterAppContext;

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      captcha: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await auth.signIn.email({
          email: value.email,
          password: value.password,
          captcha: value.captcha,
        } as Parameters<typeof auth.signIn.email>[0]);
        toast.success("Welcome back!");
        await navigate({ to: "/" });
      } catch (error) {
        const err = error as { error?: { message?: string } };
        toast.error(err.error?.message || "Invalid email or password");
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Enter a valid email address"),
        password: z.string().min(1, "Password is required"),
        captcha: z.string().min(1, "Please complete the captcha"),
      }),
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field name="email">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              Email <sup className="-ml-1 text-red-600">*</sup>
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={field.state.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                field.handleChange(e.target.value)
              }
              onBlur={field.handleBlur}
            />
            {!field.state.meta.isValid && (
              <div className="text-red-600 text-sm">
                {field.state.meta.errors
                  .flatMap((error) => error?.message)
                  .join(", ")}
              </div>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.name}>
                Password <sup className="-ml-1 text-red-600">*</sup>
              </Label>
              <Link
                to="/forgot-password"
                className="text-muted-foreground text-sm underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id={field.name}
              name={field.name}
              type="password"
              autoComplete="current-password"
              value={field.state.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                field.handleChange(e.target.value)
              }
              onBlur={field.handleBlur}
            />
            {!field.state.meta.isValid && (
              <div className="text-red-600 text-sm">
                {field.state.meta.errors
                  .flatMap((error) => error?.message)
                  .join(", ")}
              </div>
            )}
          </div>
        )}
      </form.Field>

      <div className="w-full">
        <p className="mb-2 font-medium text-sm">Let us know you are human</p>
        <Turnstile
          className="mb-2 w-full"
          onError={() => form.setFieldValue("captcha", "")}
          onExpire={() => form.setFieldValue("captcha", "")}
          onVerify={(token) => form.setFieldValue("captcha", token)}
          siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY as string}
        />
      </div>

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
