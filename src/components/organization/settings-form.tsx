import { useForm } from "@tanstack/react-form";
import {
  AlertTriangle,
  Building2,
  Camera,
  Globe,
  Loader2,
  Save,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { useActiveOrganization } from "@/hooks/use-organizations";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Name is too long"),
});

const slugSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50, "Slug is too long")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase, alphanumeric, and can contain hyphens"
    ),
});

export function OrganizationSettingsForm() {
  const { data: activeOrg, isPending: isOrgLoading } = useActiveOrganization();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showSlugWarning, setShowSlugWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Name form
  const nameForm = useForm({
    defaultValues: {
      name: activeOrg?.name ?? "",
    },
    validators: {
      onChange: nameSchema,
    },
    onSubmit: async ({ value }) => {
      if (!activeOrg) return;
      try {
        await authClient.organization.update({
          organizationId: activeOrg.id,
          data: { name: value.name },
        });
        toast.success("Organization name updated");
      } catch (error) {
        toast.error("Failed to update organization name");
        throw error;
      }
    },
  });

  // Slug form
  const slugForm = useForm({
    defaultValues: {
      slug: activeOrg?.slug ?? "",
    },
    validators: {
      onChange: slugSchema,
    },
    onSubmit: async ({ value }) => {
      if (!activeOrg) return;
      try {
        await authClient.organization.update({
          organizationId: activeOrg.id,
          data: { slug: value.slug },
        });
        toast.success("Organization slug updated");
        setShowSlugWarning(false);
      } catch (error) {
        if (error instanceof Error && error.message.includes("already")) {
          toast.error("This slug is already taken");
        } else {
          toast.error("Failed to update organization slug");
        }
        throw error;
      }
    },
  });

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !activeOrg) return;

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

    setIsUploadingLogo(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await authClient.organization.update({
        organizationId: activeOrg.id,
        data: { logo: base64 },
      });
      toast.success("Organization logo updated");
    } catch (error) {
      toast.error("Failed to update logo");
    } finally {
      setIsUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSlugChange = (value: string) => {
    slugForm.setFieldValue("slug", value.toLowerCase().replace(/\s+/g, "-"));
    if (value !== activeOrg?.slug) {
      setShowSlugWarning(true);
    } else {
      setShowSlugWarning(false);
    }
  };

  if (isOrgLoading || !activeOrg) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Logo</CardTitle>
          <CardDescription>
            Click on the logo to upload a new image
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <button
              className="group relative cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              disabled={isUploadingLogo}
              onClick={handleLogoClick}
              type="button"
            >
              <GradientAvatar
                className="transition-opacity group-hover:opacity-80"
                id={activeOrg.id}
                name={activeOrg.name}
                size="lg"
                src={activeOrg.logo}
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {isUploadingLogo ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </button>
            <div>
              <p className="font-medium">{activeOrg.name}</p>
              <p className="text-muted-foreground text-sm">
                /{activeOrg.slug}
              </p>
            </div>
          </div>
          <input
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
            ref={fileInputRef}
            type="file"
          />
        </CardContent>
      </Card>

      {/* Name Section */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Name</CardTitle>
          <CardDescription>
            The name of your organization as it appears across the application
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
                      <Label htmlFor="org-name">Name</Label>
                      <div className="relative">
                        <Building2 className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          id="org-name"
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Enter organization name"
                          value={field.state.value}
                        />
                      </div>
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

      {/* Slug Section */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Slug</CardTitle>
          <CardDescription>
            Used in URLs for your organization. Changing this may break existing
            links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              slugForm.handleSubmit();
            }}
          >
            <div className="flex flex-col gap-4">
              <slugForm.Field name="slug">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="org-slug">Slug</Label>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <Globe className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          id="org-slug"
                          onBlur={field.handleBlur}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          placeholder="my-organization"
                          value={field.state.value}
                        />
                      </div>
                      <Button
                        disabled={slugForm.state.isSubmitting}
                        size="sm"
                        type="submit"
                      >
                        {slugForm.state.isSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save
                      </Button>
                    </div>
                    {field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0 && (
                        <p className="text-destructive text-sm">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
                    <p className="text-muted-foreground text-xs">
                      Current URL: stl-shelf.com/org/
                      <span className="font-mono">{field.state.value}</span>
                    </p>
                  </div>
                )}
              </slugForm.Field>

              {showSlugWarning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Changing the slug will break any existing links to your
                    organization. Make sure to update any bookmarks or shared
                    links.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
