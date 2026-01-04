import { useEffect } from "react";

export const useErrorReporting = (error: unknown) => {
  useEffect(() => {
    if (!error || import.meta.env.SSR) return;
    import("@/lib/error-tracking.client")
      .then(({ captureClientException }) => {
        captureClientException(error);
      })
      .catch((err) => {
        console.error("Failed to report error:", err);
      });
  }, [error]);
};
