import { Box, GitBranch, Plus, Search, Tags } from "lucide-react";
import { FileStackEffect } from "@/components/empty-state/file-stack-effect";
import { uploadModalActions } from "@/stores/upload-modal.store";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  hasFilters: boolean;
};

export function EmptyState({ hasFilters }: EmptyStateProps) {
  // Filtered results empty state - simple message
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-lg">No models found</h3>
        <p className="max-w-sm text-center text-muted-foreground text-sm">
          Try adjusting your search terms or filters to find what you're looking
          for.
        </p>
      </div>
    );
  }

  // First time / empty library - impressive empty state
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-background to-muted/30 py-16">
      {/* Technical grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4">
        {/* File stack visual effect */}
        <div className="mb-8">
          <FileStackEffect />
        </div>

        {/* Heading */}
        <h2 className="mb-3 font-bold text-2xl tracking-tight">
          Your Library is Empty
        </h2>
        <p className="mb-8 max-w-md text-center text-muted-foreground">
          Upload your first 3D model to get started. STL Shelf supports{" "}
          <span className="font-medium text-foreground">STL</span>,{" "}
          <span className="font-medium text-foreground">OBJ</span>,{" "}
          <span className="font-medium text-foreground">3MF</span>, and{" "}
          <span className="font-medium text-foreground">PLY</span> files.
        </p>

        {/* CTA Button */}
        <Button
          className="mb-12 gap-2 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
          onClick={() => uploadModalActions.openModal()}
          size="lg"
        >
          <Plus className="h-5 w-5" />
          Upload Your First Model
        </Button>

        {/* Feature cards */}
        <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            description="Track iterations"
            icon={<GitBranch className="h-5 w-5" />}
            title="Version Control"
          />
          <FeatureCard
            description="Easy discovery"
            icon={<Tags className="h-5 w-5" />}
            title="Tags & Organize"
          />
          <FeatureCard
            description="Interactive view"
            icon={<Box className="h-5 w-5" />}
            title="3D Preview"
          />
        </div>
      </div>
    </div>
  );
}

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border/50 bg-card/50 p-4 text-center backdrop-blur-sm">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-background text-primary">
        {icon}
      </div>
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
  );
}
