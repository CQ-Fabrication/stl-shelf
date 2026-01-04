import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import type { AuthClient } from "@/lib/auth-client";

type MagicLinkFormProps = {
  auth: AuthClient;
  onSuccess: () => void;
  magicLinkSent: boolean;
};

export function MagicLinkForm({ auth, onSuccess, magicLinkSent }: MagicLinkFormProps) {
  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await auth.signIn.magicLink({
          email: value.email,
          callbackURL: `${window.location.origin}/library`,
        });
        onSuccess();
        toast.success("Check your email for a magic link");
      } catch (error) {
        const err = error as { error?: { message?: string } };
        toast.error(err.error?.message || "Failed to send magic link. Please try again.");
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Enter a valid email address").max(255, "Email is too long"),
      }),
    },
  });

  if (magicLinkSent) {
    return <MagicLinkSentState />;
  }

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

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button className="w-full" disabled={!canSubmit || isSubmitting} type="submit">
            {isSubmitting ? "Sending..." : "Send magic link"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

function MagicLinkSentState() {
  return (
    <div className="space-y-6 text-center">
      <div
        aria-label="Email sent successfully"
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100"
        role="img"
      >
        <svg
          aria-hidden="true"
          className="h-6 w-6 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Check your email</h3>
        <p className="text-muted-foreground text-sm">
          We've sent a magic link to your email address. Click the link to sign in.
        </p>
      </div>
    </div>
  );
}
