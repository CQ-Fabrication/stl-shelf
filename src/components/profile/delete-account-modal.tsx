import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { requestAccountDeletion } from "@/server/functions/account-deletion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DeleteAccountModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const deleteSchema = z.object({
  confirmation: z.string().refine((val) => val.trim().toUpperCase() === "DELETE", {
    message: 'Please type "DELETE" to confirm',
  }),
  password: z.string().min(1, "Password is required"),
});

export function DeleteAccountModal({ open, onOpenChange }: DeleteAccountModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      confirmation: "",
      password: "",
    },
    validators: {
      onChange: deleteSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        // Delete account with password verification
        const result = await requestAccountDeletion({ data: { password: value.password } });

        const deletionDate = result.deadline
          ? new Date(result.deadline).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : null;

        toast.success(
          deletionDate
            ? `Account deletion scheduled for ${deletionDate}.`
            : "Account deletion scheduled.",
        );

        await queryClient.invalidateQueries({ queryKey: ["account-deletion"] });
        await queryClient.invalidateQueries({ queryKey: ["upload-limits"] });
        await router.invalidate();
        handleOpenChange(false);
      } catch (error) {
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (message.includes("password") || message.includes("invalid_password")) {
            toast.error("Incorrect password");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.error("Failed to delete account");
        }
        throw error;
      }
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">Delete Account</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            This schedules deletion of your account and all data in 7 days.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">The following will be permanently deleted:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            <li>Your account and profile data</li>
            <li>All active sessions</li>
            <li>Organization memberships</li>
            <li>If owner: entire organization, models, and files</li>
          </ul>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field name="confirmation">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="confirmation">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </Label>
                <Input
                  autoComplete="off"
                  id="confirmation"
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  value={field.state.value}
                />
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <p className="text-destructive text-sm">{field.state.meta.errors[0]?.message}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="delete-password">Enter your password to confirm</Label>
                <Input
                  autoComplete="current-password"
                  id="delete-password"
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Your password"
                  type="password"
                  value={field.state.value}
                />
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <p className="text-destructive text-sm">{field.state.meta.errors[0]?.message}</p>
                )}
              </div>
            )}
          </form.Field>

          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  className="w-full sm:w-auto"
                  disabled={!canSubmit || isSubmitting}
                  type="submit"
                  variant="destructive"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Schedule Account Deletion
                </Button>
              )}
            </form.Subscribe>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
