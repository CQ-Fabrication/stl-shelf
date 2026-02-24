import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/consent")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="font-semibold text-2xl">Consent Required</h1>
        <p className="mt-2 text-muted-foreground">
          Please review and accept the current Terms of Service and Privacy Policy to continue. The
          consent dialog should appear automatically on this page.
        </p>
      </div>
    </div>
  );
}
