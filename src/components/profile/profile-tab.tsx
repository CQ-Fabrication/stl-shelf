import { useForm } from "@tanstack/react-form";
import { Camera, Loader2, Mail, Save } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GradientAvatar } from "@/components/ui/gradient-avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const nameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export function ProfileTab() {
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = session?.user;

  // Name form
  const nameForm = useForm({
    defaultValues: {
      name: user?.name ?? "",
    },
    validators: {
      onChange: nameSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await authClient.updateUser({ name: value.name });
        toast.success("Name updated successfully");
      } catch (error) {
        toast.error("Failed to update name");
        throw error;
      }
    },
  });

  // Email form
  const emailForm = useForm({
    defaultValues: {
      email: user?.email ?? "",
    },
    validators: {
      onChange: emailSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await authClient.changeEmail({ newEmail: value.email });
        toast.success(
          "Verification email sent. Please check your inbox to confirm the change."
        );
      } catch (error) {
        toast.error("Failed to change email");
        throw error;
      }
    },
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await authClient.updateUser({ image: base64 });
      toast.success("Avatar updated successfully");
    } catch (error) {
      toast.error("Failed to update avatar");
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (isSessionLoading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Click on your avatar to upload a new image
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <button
              className="group relative cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              disabled={isUploadingAvatar}
              onClick={handleAvatarClick}
              type="button"
            >
              <GradientAvatar
                className="transition-opacity group-hover:opacity-80"
                id={user.id}
                name={user.name ?? user.email}
                size="lg"
                src={user.image}
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {isUploadingAvatar ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </button>
            <div>
              <p className="font-medium">{user.name ?? "No name set"}</p>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </div>
          <input
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            ref={fileInputRef}
            type="file"
          />
        </CardContent>
      </Card>

      {/* Name Section */}
      <Card>
        <CardHeader>
          <CardTitle>Display Name</CardTitle>
          <CardDescription>
            This is how your name will appear across the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              nameForm.handleSubmit();
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <nameForm.Field name="name">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Enter your name"
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched &&
                        field.state.meta.errors.length > 0 && (
                          <p className="text-destructive text-sm">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
                    </div>
                  )}
                </nameForm.Field>
              </div>
              <Button
                disabled={nameForm.state.isSubmitting}
                size="sm"
                type="submit"
              >
                {nameForm.state.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Email Section */}
      <Card>
        <CardHeader>
          <CardTitle>Email Address</CardTitle>
          <CardDescription>
            Changing your email will require verification. We'll notify your
            current email address about this change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              emailForm.handleSubmit();
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <emailForm.Field name="email">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Enter your email"
                        type="email"
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched &&
                        field.state.meta.errors.length > 0 && (
                          <p className="text-destructive text-sm">
                            {field.state.meta.errors[0]?.message}
                          </p>
                        )}
                    </div>
                  )}
                </emailForm.Field>
              </div>
              <Button
                disabled={
                  emailForm.state.isSubmitting ||
                  emailForm.state.values.email === user.email
                }
                size="sm"
                type="submit"
              >
                {emailForm.state.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Change Email
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
