import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type ModelDetailErrorProps = {
  error?: Error | null;
};

export const ModelDetailError = ({ error }: ModelDetailErrorProps) => {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="py-12 text-center">
        <div className="mb-2 text-destructive">Failed to load model</div>
        <div className="text-muted-foreground text-sm">{error?.message || "Model not found"}</div>
        <Button asChild className="mt-4">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
      </div>
    </div>
  );
};
