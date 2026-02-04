import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Eye, EyeOff, Key, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useAccountDeletion } from "@/hooks/use-account-deletion";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteAccountModal } from "./delete-account-modal";
import { cancelAccountDeletion } from "@/server/functions/account-deletion";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function SecurityTab() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { status, deadline } = useAccountDeletion();

  const cancelDeletionMutation = useMutation({
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

  const deletionScheduled = status === "scheduled";
  const deletionDate = deadline
    ? deadline.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validators: {
      onChange: passwordSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        // Change password
        await authClient.changePassword({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        });

        // Invalidate all other sessions for security
        await authClient.revokeSessions();

        toast.success("Password changed successfully. All other sessions have been signed out.");

        // Reset form
        passwordForm.reset();
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("incorrect")) {
            toast.error("Current password is incorrect");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.error("Failed to change password");
        }
        throw error;
      }
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Password Change Section */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password. For security, all other devices will be signed out when you change
            your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              passwordForm.handleSubmit();
            }}
          >
            {/* Current Password */}
            <passwordForm.Field name="currentPassword">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter your current password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={field.state.value}
                    />
                    <Button
                      className="absolute top-0 right-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-sm">
                      {field.state.meta.errors[0]?.message}
                    </p>
                  )}
                </div>
              )}
            </passwordForm.Field>

            {/* New Password */}
            <passwordForm.Field name="newPassword">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter your new password"
                      type={showNewPassword ? "text" : "password"}
                      value={field.state.value}
                    />
                    <Button
                      className="absolute top-0 right-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-sm">
                      {field.state.meta.errors[0]?.message}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">Minimum 8 characters</p>
                </div>
              )}
            </passwordForm.Field>

            {/* Confirm Password */}
            <passwordForm.Field name="confirmPassword">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Confirm your new password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={field.state.value}
                    />
                    <Button
                      className="absolute top-0 right-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-sm">
                      {field.state.meta.errors[0]?.message}
                    </p>
                  )}
                </div>
              )}
            </passwordForm.Field>

            <Button
              className="w-full sm:w-auto"
              disabled={passwordForm.state.isSubmitting}
              type="submit"
            >
              {passwordForm.state.isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Key className="mr-2 h-4 w-4" />
              )}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Delete Account Section */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive text-sm">Delete Account</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {deletionScheduled
                    ? `Your account is scheduled for deletion on ${deletionDate}. You can cancel this before the date.`
                    : "This will schedule deletion of your account, all your sessions, organization memberships, and if you're an owner, your entire organization including all models and files."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={() => setIsDeleteModalOpen(true)}
                    size="sm"
                    variant="destructive"
                    disabled={deletionScheduled}
                  >
                    {deletionScheduled ? "Deletion Scheduled" : "Delete My Account"}
                  </Button>
                  {deletionScheduled ? (
                    <Button
                      onClick={() => cancelDeletionMutation.mutate()}
                      size="sm"
                      variant="outline"
                      disabled={cancelDeletionMutation.isPending}
                    >
                      Cancel deletion
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteAccountModal onOpenChange={setIsDeleteModalOpen} open={isDeleteModalOpen} />
    </div>
  );
}
