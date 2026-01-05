import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/test-error")({
  component: TestErrorPage,
});

function TestErrorPage() {
  // This will throw during render, triggering the error boundary
  throw new Error("Test error: This is a simulated unexpected error");
}
