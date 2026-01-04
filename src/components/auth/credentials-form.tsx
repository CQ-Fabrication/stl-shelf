import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Turnstile } from "@/components/turnstile";
import type { AuthClient } from "@/lib/auth-client";

type CredentialsFormProps = {
  auth: AuthClient;
};

export function CredentialsForm({ auth }: CredentialsFormProps) {
  const navigate = useNavigate();

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
          fetchOptions: {
            headers: {
              "x-captcha-response": value.captcha,
            },
          },
        });
        toast.success("Welcome back!");
        await navigate({ to: "/library" });
      } catch (error) {
        const err = error as { error?: { message?: string } };
        toast.error(err.error?.message || "Invalid email or password");
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Enter a valid email address").max(255, "Email is too long"),
        password: z.string().min(1, "Password is required"),
        captcha: z.string().min(1, "Please complete the captcha"),
      }),
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field name="email">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              Email <sup className="-ml-1 text-red-600">*</sup>
            </Label>
            <Input
              autoComplete="email"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e: ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
              placeholder="you@example.com"
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

      <form.Field name="password">
        {(field) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.name}>
                Password <sup className="-ml-1 text-red-600">*</sup>
              </Label>
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
              type="password"
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
          <Button className="w-full" disabled={!canSubmit || isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
