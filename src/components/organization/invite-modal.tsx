import { useForm } from "@tanstack/react-form";
import { Loader2, Mail, Send, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { useActiveOrganization } from "@/hooks/use-organizations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "member"]),
});

type InviteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

const ROLES = [
  {
    value: "member",
    label: "Member",
    description: "Standard access to the organization",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Can manage members and settings",
  },
] as const;

export function InviteModal({ open, onOpenChange, onSuccess }: InviteModalProps) {
  const { data: activeOrg } = useActiveOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      role: "member" as "admin" | "member",
    },
    validators: {
      onChange: inviteSchema,
    },
    onSubmit: async ({ value }) => {
      if (!activeOrg) return;
      setIsSubmitting(true);

      await authClient.organization.inviteMember(
        {
          organizationId: activeOrg.id,
          email: value.email,
          role: value.role,
        },
        {
          onSuccess: () => {
            toast.success(`Invitation sent to ${value.email}`);
            onOpenChange(false);
            form.reset();
            onSuccess?.();
            setIsSubmitting(false);
          },
          onError: (ctx) => {
            const message = ctx.error.message ?? "Failed to send invitation";
            // Only show specific message for member limit (safe - reveals org status, not user info)
            // All other errors use generic message to prevent email enumeration attacks
            if (message.includes("limit")) {
              toast.error("Member limit reached. Upgrade your plan to invite more members.");
            } else {
              toast.error("Unable to send invitation. Please verify the email and try again.");
            }
            setIsSubmitting(false);
          },
        },
      );
    },
  });

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation link via email. They'll be able to join your organization once they
            accept.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <div className="relative">
                  <Mail className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoComplete="email"
                    className="pl-9"
                    id="invite-email"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="colleague@example.com"
                    type="email"
                    value={field.state.value}
                  />
                </div>
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <p className="text-destructive text-sm">{field.state.meta.errors[0]?.message}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  onValueChange={(value: string) => field.handleChange(value as "admin" | "member")}
                  value={field.state.value}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{role.label}</span>
                          <span className="text-muted-foreground text-xs">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={() => handleClose(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
