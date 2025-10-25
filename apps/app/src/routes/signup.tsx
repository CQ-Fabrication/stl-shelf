import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod/v4";
import { Logo } from "@/components/logo";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@stl-shelf/ui/components/button";
import { Card, CardContent, CardHeader } from "@stl-shelf/ui/components/card";
import { Input } from "@stl-shelf/ui/components/input";
import { Label } from "@stl-shelf/ui/components/label";
import type { RouterAppContext } from "./__root";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long"),
  email: z.email("Enter a valid email address").max(200, "Email is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
      "Password must contain uppercase, lowercase, and number"
    ),
  captcha: z.string().min(1, "Captcha is required"),
});

type SignUpForm = z.infer<typeof signUpSchema>;

const defaultValues: SignUpForm = {
  name: "",
  email: "",
  password: "",
  captcha: "",
};

function SignUpPage() {
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext() as RouterAppContext;

  const handleSignUp = async (value: SignUpForm) => {
    await auth.signUp.email({
      name: value.name,
      email: value.email,
      password: value.password,
    });

    await navigate({ to: "/" });
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: signUpSchema,
      onBlur: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await handleSignUp(value);
      } catch (err) {
        if (import.meta.env.DEV) console.debug("signUp error", err);
      }
    },
  });

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
            <form.Field
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>
                    Name <sup className="-ml-1 text-red-600">*</sup>
                  </Label>
                  <Input
                    autoComplete="name"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter your name"
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
              name="name"
            />

            <form.Field
              children={(field) => (
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
                      {field.state.meta.errors
                        .flatMap((error) => error?.message)
                        .join(", ")}
                    </div>
                  )}
                </div>
              )}
              name="email"
            />

            <form.Field
              children={(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>
                    Password <sup className="-ml-1 text-red-600">*</sup>
                  </Label>
                  <Input
                    autoComplete="new-password"
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
              name="password"
            />

            <Turnstile
              className="m-2 flex justify-center"
              onError={() => form.setFieldValue("captcha", "")}
              onExpire={() => form.setFieldValue("captcha", "")}
              onVerify={(token) => form.setFieldValue("captcha", token)}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY as string}
            />

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <div className="flex w-full flex-col items-center gap-2">
                  <Button
                    className="w-full"
                    disabled={!canSubmit || isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? "Creating…" : "Create account"}
                  </Button>
                  <Link
                    className="mt-2 text-muted-foreground text-sm underline-offset-4"
                    to="/login"
                  >
                    Already have an account?{" "}
                    <span className="underline">Sign in</span>
                  </Link>
                </div>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
