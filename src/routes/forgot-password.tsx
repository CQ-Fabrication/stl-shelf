import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
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
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRequestReset = async (value: ForgotPasswordForm) => {
    await authClient.requestPasswordReset({
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
        if (import.meta.env.DEV) console.debug("requestPasswordReset error", err);
        setIsSubmitted(true);
      }
    },
  });

  if (isSubmitted) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="grid place-items-center border-b">
            <Link to="/">
              <Logo aria-label="STL Shelf" className="h-10" />
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="font-semibold text-lg">Check your email</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                If an account exists with the email address you provided, we've sent a password
                reset link.
              </p>
              <p className="mt-4 text-muted-foreground text-sm">The link will expire in 1 hour.</p>
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
          <Link to="/">
            <Logo aria-label="STL Shelf" className="h-10" />
          </Link>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6">
            <h2 className="font-semibold text-lg">Forgot your password?</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Enter your email address and we'll send you a link to reset your password.
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
            <form.Field name="email">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>
                    Email <sup className="-ml-1 text-red-600">*</sup>
                  </Label>
                  <Input
                    autoComplete="email"
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
                      {field.state.meta.errors.flatMap((error) => error?.message).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button className="w-full" disabled={!canSubmit || isSubmitting} type="submit">
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
