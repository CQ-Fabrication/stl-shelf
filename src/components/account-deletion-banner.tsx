import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccountDeletion } from "@/hooks/use-account-deletion";
import { cancelAccountDeletion } from "@/server/functions/account-deletion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export function AccountDeletionBanner() {
  const queryClient = useQueryClient();
  const { status, deadline, daysRemaining, isLoading } = useAccountDeletion();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: () => cancelAccountDeletion(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["account-deletion"] });
      await queryClient.invalidateQueries({ queryKey: ["upload-limits"] });
      toast.success("Account deletion canceled");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to cancel account deletion");
    },
  });

  if (isLoading || status !== "scheduled" || !deadline) {
    return null;
  }

  const daysText = daysRemaining === 1 ? "1 day remaining" : `${daysRemaining ?? 0} days remaining`;

  return (
    <div className="px-4 pt-4">
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive text-sm">Account deletion scheduled</p>
              <p className="text-muted-foreground text-sm">
                Your account is read-only and will be deleted on {formatDate(deadline)} ({daysText}
                ).
              </p>
            </div>
          </div>
          <Button onClick={() => setConfirmOpen(true)} size="sm" variant="outline">
            Cancel deletion
          </Button>
        </div>
      </div>
      <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel account deletion?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will return to normal and write access will be restored immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <Button onClick={() => setConfirmOpen(false)} type="button" variant="outline">
              Keep deletion scheduled
            </Button>
            <Button
              onClick={() => cancelMutation.mutate()}
              type="button"
              variant="default"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Canceling..." : "Cancel deletion"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
