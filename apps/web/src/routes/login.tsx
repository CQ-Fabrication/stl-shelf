import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod/v4";
import { Logo } from "@/components/logo";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RouterAppContext } from "./__root";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(200, "Email is too long"),
  password: z.string().min(1, "Password is required"),
  captcha: z.string().min(1, "Please complete the captcha"),
});

type LoginForm = z.infer<typeof loginSchema>;

const defaultValues: LoginForm = {
  email: "",
  password: "",
  captcha: "",
};

function LoginPage() {
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext() as RouterAppContext;
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmittingMagicLink, setIsSubmittingMagicLink] = useState(false);

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setMessage(null);
      try {
        await auth.signIn.email({
          email: value.email,
          password: value.password,
          captcha: value.captcha,
        } as Parameters<typeof auth.signIn.email>[0]);
        await navigate({ to: "/" });
      } catch (err) {
        if (import.meta.env.DEV) console.debug("signIn error", err);
        setMessage("Sign in failed. Please check your credentials.");
      }
    },
  });

  const sendMagicLink = async () => {
    setIsSubmittingMagicLink(true);
    setMessage(null);

    const email = form.state.values.email;
    const captcha = form.state.values.captcha;

    // Validate email and captcha before sending
    const emailValidation = z.string().email("Invalid email").safeParse(email);
    if (!emailValidation.success) {
      setMessage("Please enter a valid email address.");
      setIsSubmittingMagicLink(false);
      return;
    }

    if (!captcha) {
      setMessage("Please complete the captcha.");
      setIsSubmittingMagicLink(false);
      return;
    }

    try {
      await auth.sendVerificationEmail({
        email,
        captcha,
      } as Parameters<typeof auth.sendVerificationEmail>[0]);
      setMessage("Magic link sent! Check your email.");
    } catch (err) {
      if (import.meta.env.DEV) console.debug("sendMagicLink error", err);
      setMessage("Could not send magic link. Please try again.");
    } finally {
      setIsSubmittingMagicLink(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="grid place-items-center border-b">
          <Logo aria-label="STL Shelf" className="h-8" />
        </CardHeader>
        <CardContent className="pt-6">
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
                  <Label htmlFor={field.name}>Email</Label>
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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field.name}>Password</Label>
                    <Link
                      className="text-muted-foreground text-sm underline underline-offset-4"
                      to="/forgot-password"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    autoComplete="current-password"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter your password"
                    type="password"
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
            </form.Field>

            <div className="w-full">
              <p className="mb-2 font-medium text-sm">
                Let us know you are human
              </p>
              <Turnstile
                className="mb-2 w-full"
                onError={() => form.setFieldValue("captcha", "")}
                onExpire={() => form.setFieldValue("captcha", "")}
                onVerify={(token) => form.setFieldValue("captcha", token)}
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY as string}
              />
            </div>

            {message && (
              <div
                className={`text-sm ${
                  message.includes("sent") ? "text-green-600" : "text-red-600"
                }`}
              >
                {message}
              </div>
            )}

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <div className="flex justify-between">
                  <Button
                    disabled={
                      !canSubmit || isSubmitting || isSubmittingMagicLink
                    }
                    type="submit"
                  >
                    {isSubmitting ? "Signing in…" : "Sign in"}
                  </Button>
                  <Button
                    className="pr-0 text-left text-muted-foreground text-sm underline underline-offset-4"
                    disabled={isSubmittingMagicLink || isSubmitting}
                    onClick={sendMagicLink}
                    type="button"
                    variant="ghost"
                  >
                    {isSubmittingMagicLink ? "Sending…" : "Send magic link"}
                  </Button>
                </div>
              )}
            </form.Subscribe>

            <div className="mt-6 text-center text-muted-foreground text-sm">
              Don't have an account?{" "}
              <Link className="underline underline-offset-4" to="/signup">
                Create one
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
