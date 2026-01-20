/**
 * Print Profiles Section
 *
 * Main section displaying print profiles for a model version.
 * Handles listing, uploading, conflict resolution, and deletion.
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { PrintProfileCard } from "./print-profile-card";
import { ProfileUploadZone } from "./profile-upload-zone";
import {
  ProfileConflictDialog,
  type ConflictInfo,
  type ConflictResolution,
} from "./profile-conflict-dialog";
import {
  listPrintProfiles,
  uploadPrintProfile,
  deletePrintProfile,
  resolveProfileConflict,
  getProfileDownloadInfo,
} from "@/server/functions/print-profiles";

type PrintProfilesSectionProps = {
  versionId: string;
};

export const PrintProfilesSection = ({ versionId }: PrintProfilesSectionProps) => {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [pendingFiles, setPendingFiles] = useState<Map<string, File>>(new Map());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["print-profiles", versionId],
    queryFn: () => listPrintProfiles({ data: { versionId } }),
  });

  const profiles = data?.profiles ?? [];

  const invalidateProfiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["print-profiles", versionId] });
  }, [queryClient, versionId]);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results: { file: File; result: Awaited<ReturnType<typeof uploadPrintProfile>> }[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("versionId", versionId);
        formData.append("file", file);
        const result = await uploadPrintProfile({ data: formData });
        results.push({ file, result });
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => "success" in r.result && r.result.success).length;
      const conflictResults = results.filter((r) => "conflict" in r.result && r.result.conflict);
      const failedResults = results.filter(
        (r) => "success" in r.result && r.result.success === false,
      );

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? "Profile uploaded successfully"
            : `${successCount} profiles uploaded successfully`,
        );
        invalidateProfiles();
      }

      // Handle failed uploads
      if (failedResults.length > 0) {
        for (const { file, result } of failedResults) {
          if ("reason" in result) {
            const reason = result.reason;
            if (reason === "not_3mf") {
              toast.error(`${file.name} is not a 3MF file`);
            } else if (reason === "unknown_format") {
              toast.error(
                `${file.name}: Unsupported slicer format. We support Bambu Studio, OrcaSlicer, and PrusaSlicer.`,
              );
            } else if (reason === "parse_error") {
              toast.error(
                `${file.name}: Failed to parse file${result.error ? ` - ${result.error}` : ""}`,
              );
            }
          }
        }
      }

      if (conflictResults.length > 0) {
        const newConflicts: ConflictInfo[] = [];
        const newPending = new Map<string, File>();

        for (const { file, result } of conflictResults) {
          if ("conflict" in result && result.conflict && "conflictInfo" in result) {
            const conflictInfo = result.conflictInfo;
            newConflicts.push({
              file,
              existingProfileId: conflictInfo.existingProfile.id,
              existingPrinterName: conflictInfo.existingProfile.printerName,
              newPrinterName: conflictInfo.newProfile.printerName,
            });
            newPending.set(conflictInfo.existingProfile.id, file);
          }
        }

        setConflicts(newConflicts);
        setPendingFiles(newPending);
      }
    },
    onError: () => {
      toast.error("Failed to upload profile");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (resolutions: Map<string, ConflictResolution>) => {
      const promises: Promise<unknown>[] = [];

      for (const [profileId, resolution] of resolutions) {
        if (resolution === "skip") continue;

        const file = pendingFiles.get(profileId);
        if (!file) continue;

        const formData = new FormData();
        formData.append("versionId", versionId);
        formData.append("existingProfileId", profileId);
        formData.append("action", resolution === "replace" ? "replace" : "keep_both");
        formData.append("file", file);

        promises.push(resolveProfileConflict({ data: formData }));
      }

      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("Conflicts resolved");
      setConflicts([]);
      setPendingFiles(new Map());
      invalidateProfiles();
    },
    onError: () => {
      toast.error("Failed to resolve conflicts");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (profileId: string) => deletePrintProfile({ data: { profileId } }),
    onSuccess: () => {
      toast.success("Profile deleted");
      invalidateProfiles();
    },
    onError: () => {
      toast.error("Failed to delete profile");
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const handleFilesSelected = async (files: File[]) => {
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(files);
    } finally {
      setIsUploading(false);
    }
  };

  const handleResolveConflicts = (resolutions: Map<string, ConflictResolution>) => {
    resolveMutation.mutate(resolutions);
  };

  const handleDownload = async (profileId: string) => {
    try {
      const { downloadUrl, filename } = await getProfileDownloadInfo({ data: { profileId } });

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Failed to download profile");
    }
  };

  const handleDelete = (profileId: string) => {
    setDeletingId(profileId);
    deleteMutation.mutate(profileId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <>
        <ProfilesEmptyState onFilesSelected={handleFilesSelected} isUploading={isUploading} />
        <ProfileConflictDialog
          conflicts={conflicts}
          isResolving={resolveMutation.isPending}
          onOpenChange={(open) => !open && setConflicts([])}
          onResolve={handleResolveConflicts}
          open={conflicts.length > 0}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <ProfileUploadZone
        className="mb-4"
        isUploading={isUploading}
        onFilesSelected={handleFilesSelected}
      />

      <div className="space-y-3">
        {profiles.map((profile) => (
          <PrintProfileCard
            isDeleting={deletingId === profile.id}
            key={profile.id}
            onDelete={() => handleDelete(profile.id)}
            onDownload={() => handleDownload(profile.id)}
            profile={profile}
          />
        ))}
      </div>

      <ProfileConflictDialog
        conflicts={conflicts}
        isResolving={resolveMutation.isPending}
        onOpenChange={(open) => !open && setConflicts([])}
        onResolve={handleResolveConflicts}
        open={conflicts.length > 0}
      />
    </div>
  );
};

const ProfilesEmptyState = ({
  onFilesSelected,
  isUploading,
}: {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
}) => {
  return (
    <div className="rounded-lg border-2 border-dashed py-12 text-center">
      <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 font-medium text-lg">No print profiles yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-muted-foreground text-sm">
        Upload 3MF files from your slicer to save print settings for different printers. Supports
        Bambu Studio, PrusaSlicer, and OrcaSlicer.
      </p>
      <ProfileUploadZone
        className="mx-auto mt-6 max-w-md"
        isUploading={isUploading}
        onFilesSelected={onFilesSelected}
      />
    </div>
  );
};
