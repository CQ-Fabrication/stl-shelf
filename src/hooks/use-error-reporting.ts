import { useEffect } from "react";
import { generateErrorId } from "@/lib/error-id";
import { gatherErrorContext, type SessionContext } from "@/lib/error-context";

interface ErrorReportingContext {
  errorId?: string;
  route?: string;
  session?: SessionContext | null;
}

export const useErrorReporting = (error: unknown, context?: ErrorReportingContext) => {
  const errorId = context?.errorId;
  const route = context?.route;
  const session = context?.session;

  useEffect(() => {
    if (!error || import.meta.env.SSR) return;

    const enhancedContext = gatherErrorContext(
      errorId ?? generateErrorId(),
      route ?? (typeof window !== "undefined" ? window.location.pathname : "/"),
      session,
    );

    import("@/lib/error-tracking.client")
      .then(({ captureClientException }) => {
        captureClientException(error, enhancedContext);
      })
      .catch((err) => {
        console.error("Failed to report error:", err);
      });
  }, [error, errorId, route, session]);
};
