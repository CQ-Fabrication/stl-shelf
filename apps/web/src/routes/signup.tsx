import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

  async function afterSignUp() {
    // With autoSignIn enabled server-side, user should be logged in.
    await navigate({ to: '/' });
  }

  async function signUpWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      await auth.signUp.email({ name, email, password });
      await afterSignUp();
    } catch (err) {
      setMessage((err as Error).message || 'Sign up failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="mb-6 font-bold text-2xl">Create your account</h1>

      <form className="flex flex-col gap-3" onSubmit={signUpWithEmail}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create account'}
          </Button>
          <Link
            to="/login"
            className="text-muted-foreground text-sm underline underline-offset-4"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </form>

      {message ? (
        <div className="mt-4 text-muted-foreground text-sm">{message}</div>
      ) : null}
    </div>
  );
}

