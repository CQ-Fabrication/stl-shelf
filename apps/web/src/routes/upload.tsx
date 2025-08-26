import { createFileRoute } from "@tanstack/react-router";
import { ModelUpload } from "@/components/models/model-upload";

export const Route = createFileRoute("/upload")({
	component: UploadComponent,
});

function UploadComponent() {
	return (
		<div className="container mx-auto px-4 py-6">
			<ModelUpload />
		</div>
	);
}