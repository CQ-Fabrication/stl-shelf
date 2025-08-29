import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RouterAppContext } from './__root';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  // Access auth client from router context
  const { auth } = Route.useRouteContext() as RouterAppContext;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const serverUrl = import.meta.env.VITE_SERVER_URL as string;

  async function afterLogin() {
    // After successful login, go to home
    await navigate({ to: '/' });
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      // BetterAuth: email/password sign-in
      // Path: /sign-in/email -> auth.signIn.email
      await auth.signIn.email({ email, password });
      await afterLogin();
    } catch (err) {
      setMessage((err as Error).message || 'Password sign-in failed');
    } finally {
      setPending(false);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      // Send verification email if enabled (acts as magic link when configured)
      // Path: /send-verification-email -> auth.sendVerificationEmail
      await auth.sendVerificationEmail({ email });
      setMessage('Verification email sent. Check your inbox.');
    } catch (err) {
      setMessage((err as Error).message || 'Email send failed');
    } finally {
      setPending(false);
    }
  }

  async function signInWithPasskey() {
    setPending(true);
    setMessage(null);
    try {
      // If passkey plugin is enabled server-side, this will initiate WebAuthn
      // Otherwise this will throw and we show a friendly message
      // @ts-ignore - plugin may not be present in client types until enabled
      await auth.passkey?.signIn?.();
      await afterLogin();
    } catch (err) {
      setMessage((err as Error).message || 'Passkey sign-in failed');
    } finally {
      setPending(false);
    }
  }

  function oauth(provider: 'github' | 'google') {
    // Prefer built-in client method when available
    // Path: /sign-in/social -> auth.signIn.social
    // @ts-ignore - types may not be generated until runtime
    if (typeof auth.signIn?.social === 'function') {
      void auth.signIn.social({ provider: provider });
      return;
    }
    // Fallback: direct navigate to provider endpoint
    window.location.href = `${serverUrl}/auth/oauth/${provider}`;
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="mb-6 font-bold text-2xl">Sign in to STL Shelf</h1>

      <div className="flex flex-col gap-3">
        <Button onClick={() => oauth('github')} variant="outline">
          Continue with GitHub
        </Button>
        <Button onClick={() => oauth('google')} variant="outline">
          Continue with Google
        </Button>
        <Button onClick={signInWithPasskey}>Continue with Passkey</Button>
      </div>

      <div className="my-6 text-center text-muted-foreground text-sm">or</div>

      <form className="flex flex-col gap-3" onSubmit={signInWithPassword}>
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
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            value={password}
          />
        </div>
        <div className="flex gap-2">
          <Button disabled={pending} type="submit">
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
          <Button onClick={sendMagicLink} type="button" variant="ghost">
            Send magic link
          </Button>
        </div>
      </form>

      {message ? (
        <div className="mt-4 text-muted-foreground text-sm">{message}</div>
      ) : null}
    </div>
  );
}
