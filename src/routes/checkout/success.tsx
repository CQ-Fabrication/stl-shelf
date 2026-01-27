import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/checkout/success")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: CheckoutSuccessPage,
  validateSearch: z.object({
    checkout_id: z.string().optional(),
  }),
});

function CheckoutSuccessPage() {
  const { checkout_id } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ["billing"],
    });
  }, [queryClient]);

  return (
    <div className="container mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your subscription has been activated and limits have been updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checkout_id ? (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-center text-muted-foreground text-sm">
                Checkout ID: <code className="font-mono text-xs">{checkout_id}</code>
              </p>
            </div>
          ) : null}

          <div className="flex gap-4">
            <Button
              className="flex-1"
              onClick={() => navigate({ to: "/billing" })}
              variant="outline"
            >
              View Billing
            </Button>
            <Button className="flex-1" onClick={() => navigate({ to: "/" })}>
              Go to Library
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
