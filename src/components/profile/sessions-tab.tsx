import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, LogOut, Monitor, Smartphone, Tablet, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Session = {
  id: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Parse user agent to determine device type and browser
 */
function parseUserAgent(userAgent?: string | null): {
  device: "desktop" | "tablet" | "mobile" | "unknown";
  browser: string;
  os: string;
} {
  if (!userAgent) {
    return { device: "unknown", browser: "Unknown", os: "Unknown" };
  }

  // Detect device type
  let device: "desktop" | "tablet" | "mobile" | "unknown" = "desktop";
  if (/tablet|ipad/i.test(userAgent)) {
    device = "tablet";
  } else if (/mobile|iphone|android.*mobile/i.test(userAgent)) {
    device = "mobile";
  }

  // Detect browser
  let browser = "Unknown";
  if (/edg\//i.test(userAgent)) {
    browser = "Edge";
  } else if (/chrome/i.test(userAgent)) {
    browser = "Chrome";
  } else if (/firefox/i.test(userAgent)) {
    browser = "Firefox";
  } else if (/safari/i.test(userAgent)) {
    browser = "Safari";
  } else if (/opera|opr/i.test(userAgent)) {
    browser = "Opera";
  }

  // Detect OS
  let os = "Unknown";
  if (/windows/i.test(userAgent)) {
    os = "Windows";
  } else if (/macintosh|mac os/i.test(userAgent)) {
    os = "macOS";
  } else if (/linux/i.test(userAgent)) {
    os = "Linux";
  } else if (/android/i.test(userAgent)) {
    os = "Android";
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    os = "iOS";
  }

  return { device, browser, os };
}

function DeviceIcon({ device }: { device: "desktop" | "tablet" | "mobile" | "unknown" }) {
  switch (device) {
    case "mobile":
      return <Smartphone className="h-5 w-5" />;
    case "tablet":
      return <Tablet className="h-5 w-5" />;
    case "desktop":
      return <Monitor className="h-5 w-5" />;
    default:
      return <Globe className="h-5 w-5" />;
  }
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  // Less than a minute
  if (diff < 60000) {
    return "Just now";
  }

  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }

  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  // Format as date
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function SessionsTab() {
  const queryClient = useQueryClient();
  const { data: sessionData } = authClient.useSession();
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // Fetch all sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const result = await authClient.listSessions();
      return result.data as Session[] | undefined;
    },
  });

  const currentSessionToken = sessionData?.session?.token;

  const currentSession = sessions?.find((s) => s.token === currentSessionToken);
  const otherSessions = sessions?.filter((s) => s.token !== currentSessionToken) ?? [];

  const handleRevokeSession = async (token: string) => {
    setRevokingSession(token);
    try {
      await authClient.revokeSession({ token });
      toast.success("Session revoked");
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setRevokingSession(null);
    }
  };

  const handleRevokeAll = async () => {
    setIsRevokingAll(true);
    try {
      await authClient.revokeSessions();
      toast.success("All other sessions have been revoked");
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch {
      toast.error("Failed to revoke sessions");
    } finally {
      setIsRevokingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Current Session */}
      {currentSession && (
        <Card className="border-brand/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Current Session</CardTitle>
                <CardDescription>This is the device you're currently using</CardDescription>
              </div>
              <Badge className="bg-brand text-brand-foreground">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <SessionItem isCurrentSession session={currentSession} />
          </CardContent>
        </Card>
      )}

      {/* Other Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Other Sessions</CardTitle>
              <CardDescription>
                {otherSessions.length > 0
                  ? `You're signed in on ${otherSessions.length} other device${otherSessions.length > 1 ? "s" : ""}`
                  : "No other active sessions"}
              </CardDescription>
            </div>
            {otherSessions.length > 0 && (
              <Button
                disabled={isRevokingAll}
                onClick={handleRevokeAll}
                size="sm"
                variant="outline"
              >
                {isRevokingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Revoke All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {otherSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Monitor className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">You're only signed in on this device</p>
            </div>
          ) : (
            <div className="space-y-4">
              {otherSessions.map((session) => (
                <SessionItem
                  isRevoking={revokingSession === session.token}
                  key={session.id}
                  onRevoke={() => handleRevokeSession(session.token)}
                  session={session}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionItem({
  session,
  isCurrentSession = false,
  isRevoking = false,
  onRevoke,
}: {
  session: Session;
  isCurrentSession?: boolean;
  isRevoking?: boolean;
  onRevoke?: () => void;
}) {
  const { device, browser, os } = parseUserAgent(session.userAgent);

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <DeviceIcon device={device} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-sm">
            {browser} on {os}
          </p>
          {device === "mobile" && (
            <Badge className="text-xs" variant="secondary">
              Mobile
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          {session.ipAddress && <span>{session.ipAddress}</span>}
          <span>•</span>
          <span>Last active {formatDate(session.updatedAt)}</span>
        </div>
      </div>
      {!isCurrentSession && onRevoke && (
        <Button disabled={isRevoking} onClick={onRevoke} size="icon" variant="ghost">
          {isRevoking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          )}
        </Button>
      )}
    </div>
  );
}
