import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";
import { generateFingerprint } from "@/lib/fingerprint";
import { getLatestDocumentsFn, submitConsentFn } from "@/server/functions/consent";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: SignUpPage,
});

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.email("Enter a valid email address").max(200, "Email is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
      "Password must contain uppercase, lowercase, and number",
    ),
  captcha: z.string().min(1, "Captcha is required"),
  termsPrivacyAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms and Privacy Policy",
  }),
});

type SignUpForm = z.infer<typeof signUpSchema>;

const defaultValues: SignUpForm = {
  name: "",
  email: "",
  password: "",
  captcha: "",
  termsPrivacyAccepted: false,
};

function SignUpPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // Fetch latest document versions for consent
  const { data: documents } = useQuery({
    queryKey: ["consent-documents"],
    queryFn: () => getLatestDocumentsFn(),
  });

  const handleSignUp = async (value: SignUpForm) => {
    const termsVersion = documents?.termsAndConditions?.version;

    if (!termsVersion) {
      toast.error("Terms and conditions not available. Please try again.");
      return;
    }

    // Sign up first
    const result = await authClient.signUp.email({
      name: value.name,
      email: value.email,
      password: value.password,
      fetchOptions: {
        headers: {
          "x-captcha-response": value.captcha,
        },
      },
    });

    if (!result.data?.user?.id) {
      toast.error("Failed to create account. Please try again.");
      return;
    }

    // Generate fingerprint and submit consent
    const fingerprint = await generateFingerprint();

    try {
      await submitConsentFn({
        data: {
          userId: result.data.user.id,
          email: value.email,
          termsPrivacyAccepted: true,
          termsPrivacyVersion: termsVersion,
          marketingAccepted: false, // Marketing consent collected via post-login banner
          fingerprint,
        },
      });
    } catch {
      // If consent fails, we must block - per spec
      toast.error("Failed to record consent. Please try again.");
      return;
    }

    await navigate({
      to: "/verify-email-pending",
      search: { email: value.email },
    });
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: signUpSchema,
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
          <Link to="/">
            <Logo aria-label="STL Shelf" className="h-10" />
          </Link>
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
            <form.Field name="name">
              {(field) => (
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
                      {field.state.meta.errors.flatMap((error) => error?.message).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

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

            <form.Field name="password">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>
                    Password <sup className="-ml-1 text-red-600">*</sup>
                  </Label>
                  <div className="relative">
                    <Input
                      autoComplete="new-password"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={field.state.value}
                    />
                    <Button
                      className="absolute top-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {!field.state.meta.isValid && (
                    <div className="text-red-600 text-sm">
                      {field.state.meta.errors.flatMap((error) => error?.message).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {/* Terms & Privacy Policy - Required */}
            <form.Field name="termsPrivacyAccepted">
              {(field) => (
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      aria-invalid={!field.state.meta.isValid}
                      checked={field.state.value as boolean}
                      className="mt-0.5"
                      id="termsPrivacyAccepted"
                      onCheckedChange={(checked: boolean) => field.handleChange(checked)}
                    />
                    <Label
                      className="text-sm leading-relaxed font-normal cursor-pointer"
                      htmlFor="termsPrivacyAccepted"
                    >
                      I accept the{" "}
                      <Link
                        className="text-primary underline hover:no-underline"
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        to="/terms"
                      >
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link
                        className="text-primary underline hover:no-underline"
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        to="/privacy"
                      >
                        Privacy Policy
                      </Link>
                      <sup className="ml-0.5 text-destructive">*</sup>
                    </Label>
                  </div>
                  {!field.state.meta.isValid && (
                    <div className="text-red-600 text-sm ml-6">
                      {field.state.meta.errors.flatMap((error) => error?.message).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            <Turnstile
              className="m-2 flex justify-center"
              onError={() => form.setFieldValue("captcha", "")}
              onExpire={() => form.setFieldValue("captcha", "")}
              onVerify={(token) => form.setFieldValue("captcha", token)}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY as string}
            />

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <div className="flex w-full flex-col items-center gap-2">
                  <Button className="w-full" disabled={!canSubmit || isSubmitting} type="submit">
                    {isSubmitting ? "Creating..." : "Create account"}
                  </Button>
                  <Link
                    className="mt-2 text-muted-foreground text-sm underline-offset-4"
                    to="/login"
                  >
                    Already have an account? <span className="underline">Sign in</span>
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
