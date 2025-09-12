import { useForm } from '@tanstack/react-form';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod/v4';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RouterAppContext } from './__root';

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
});

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
        'Password must contain uppercase, lowercase, and number'
      ),
    confirmPassword: z.string(),
    token: z.string().min(1, 'Reset token is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const defaultValues: ResetPasswordForm = {
  newPassword: '',
  confirmPassword: '',
  token: '',
};

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext() as RouterAppContext;

  const urlParams = new URLSearchParams(window.location.search);
  const tokenParam = urlParams.get('token');
  const errorParam = urlParams.get('error');

  const hasInvalidToken = errorParam === 'INVALID_TOKEN' || !tokenParam;
  const token = tokenParam || '';

  const handleResetPassword = async (value: ResetPasswordForm) => {
    await auth.resetPassword({
      newPassword: value.newPassword,
      token: value.token,
    });

    navigate({ to: '/login' });
  };

  const form = useForm({
    defaultValues: {
      ...defaultValues,
      token,
    },
    validators: {
      onSubmit: resetPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      await handleResetPassword(value);
    },
  });

  const submissionError = form.state.errorMap.onSubmit;

  if (form.state.isSubmitSuccessful) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="grid place-items-center border-b">
            <Logo aria-label="STL Shelf" className="h-8" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="font-semibold text-lg">
                Password reset successful
              </h2>
              <p className="mt-2 text-muted-foreground text-sm">
                Your password has been reset successfully. You'll be redirected
                to the login page shortly.
              </p>
              <div className="mt-6">
                <Link to="/login">
                  <Button className="w-full">Go to login</Button>
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
            <h2 className="font-semibold text-lg">Reset your password</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Enter your new password below.
            </p>
          </div>

          {hasInvalidToken && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
              This password reset link is invalid or has expired. Please request
              a new one.
            </div>
          )}

          {submissionError && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
              {typeof submissionError === 'string'
                ? submissionError
                : 'Failed to reset password. Please try again or request a new reset link.'}
            </div>
          )}

          {hasInvalidToken ? (
            <div className="flex flex-col gap-3">
              <Link to="/forgot-password">
                <Button className="w-full">Request new password reset</Button>
              </Link>
              <Link to="/login">
                <Button className="w-full" variant="outline">
                  Back to login
                </Button>
              </Link>
            </div>
          ) : (
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
                      New Password <sup className="-ml-1 text-red-600">*</sup>
                    </Label>
                    <Input
                      autoComplete="new-password"
                      autoFocus
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter new password"
                      type="password"
                      value={field.state.value}
                    />
                    {!field.state.meta.isValid && (
                      <div className="text-red-600 text-sm">
                        {field.state.meta.errors
                          .flatMap((error) => error?.message)
                          .join(', ')}
                      </div>
                    )}
                  </div>
                )}
                name="newPassword"
              />

              <form.Field
                children={(field) => (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={field.name}>
                      Confirm Password{' '}
                      <sup className="-ml-1 text-red-600">*</sup>
                    </Label>
                    <Input
                      autoComplete="new-password"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Confirm new password"
                      type="password"
                      value={field.state.value}
                    />
                    {!field.state.meta.isValid && (
                      <div className="text-red-600 text-sm">
                        {field.state.meta.errors
                          .flatMap((error) => error?.message)
                          .join(', ')}
                      </div>
                    )}
                  </div>
                )}
                name="confirmPassword"
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
                    {isSubmitting ? 'Resetting...' : 'Reset password'}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          )}

          {!hasInvalidToken && (
            <div className="mt-6 text-center text-muted-foreground text-sm">
              <Link className="underline underline-offset-4" to="/login">
                Back to login
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
