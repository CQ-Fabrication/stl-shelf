import { useEffect } from "react";

export const useErrorReporting = (error: unknown) => {
  useEffect(() => {
    if (!error || import.meta.env.SSR) return;
    void import("@/lib/error-tracking.client").then(({ captureClientException }) => {
      captureClientException(error);
    });
  }, [error]);
};
