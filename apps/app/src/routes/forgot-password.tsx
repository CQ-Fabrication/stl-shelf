import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod/v4";
import { Logo } from "@/components/logo";
import { Button } from "@stl-shelf/ui/components/button";
import { Card, CardContent, CardHeader } from "@stl-shelf/ui/components/card";
import { Input } from "@stl-shelf/ui/components/input";
import { Label } from "@stl-shelf/ui/components/label";
import type { RouterAppContext } from "./__root";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address").max(200, "Email is too long"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

const defaultValues: ForgotPasswordForm = {
  email: "",
};

function ForgotPasswordPage() {
  const { auth } = Route.useRouteContext() as RouterAppContext;
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRequestReset = async (value: ForgotPasswordForm) => {
    await auth.requestPasswordReset({
      email: value.email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: forgotPasswordSchema,
      onBlur: forgotPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await handleRequestReset(value);
        setIsSubmitted(true);
      } catch (err) {
        if (import.meta.env.DEV)
          console.debug("requestPasswordReset error", err);
        // Don't reveal whether the email exists - still show success
        setIsSubmitted(true);
      }
    },
  });

  if (isSubmitted) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="grid place-items-center border-b">
            <Logo aria-label="STL Shelf" className="h-8" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="font-semibold text-lg">Check your email</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                If an account exists with the email address you provided, we've
                sent a password reset link.
              </p>
              <p className="mt-4 text-muted-foreground text-sm">
                The link will expire in 1 hour.
              </p>
              <div className="mt-6">
                <Link to="/login">
                  <Button className="w-full" variant="outline">
                    Back to login
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="grid place-items-center border-b">
          <Logo aria-label="STL Shelf" className="h-8" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6">
            <h2 className="font-semibold text-lg">Forgot your password?</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>
          </div>

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>
                    Email <sup className="-ml-1 text-red-600">*</sup>
                  </Label>
                  <Input
                    autoComplete="email"
                    autoFocus
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter your email"
                    type="email"
                    value={field.state.value}
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
              name="email"
            />

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  className="w-full"
                  disabled={!canSubmit || isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Sending..." : "Send reset link"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <div className="mt-6 text-center text-muted-foreground text-sm">
            Remember your password?{" "}
            <Link className="underline underline-offset-4" to="/login">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
