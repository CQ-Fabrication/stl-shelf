import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Logo } from '@/components/logo';
import { Turnstile } from '@/components/turnstile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RouterAppContext } from './__root';

export const Route = createFileRoute('/signup')({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext() as RouterAppContext;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);

  async function afterSignUp() {
    // With autoSignIn enabled server-side, user should be logged in.
    await navigate({ to: '/' });
  }

  async function signUpWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      await auth.signUp.email({ name, email, password, captcha });
      await afterSignUp();
    } catch (err) {
      if (import.meta.env.DEV) console.debug('signUp error', err);
      setMessage('Sign up failed. Please review your details or try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="grid place-items-center border-b">
          <Logo aria-label="STL Shelf" className="h-8" />
        </CardHeader>
        <CardContent className="pt-6">
          <form className="flex flex-col gap-3" onSubmit={signUpWithEmail}>
            <Turnstile
              className="mb-2"
              onError={() => setCaptcha(null)}
              onExpire={() => setCaptcha(null)}
              onVerify={(token) => setCaptcha(token)}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY as string}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                autoComplete="name"
                id="name"
                name="name"
                onChange={(e) => setName(e.target.value)}
                required
                value={name}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                autoComplete="email"
                id="email"
                name="email"
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                autoComplete="new-password"
                id="password"
                minLength={8}
                name="password"
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button disabled={pending || !captcha} type="submit">
                {pending ? 'Creating…' : 'Create account'}
              </Button>
              <Link
                className="text-muted-foreground text-sm underline underline-offset-4"
                to="/login"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </form>

          {message ? (
            <div className="mt-4 text-muted-foreground text-sm">{message}</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
