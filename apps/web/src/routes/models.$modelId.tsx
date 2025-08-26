import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { STLViewerWithSuspense } from "@/components/viewer/stl-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
	ArrowLeft, 
	Download, 
	Calendar, 
	HardDrive, 
	Tag, 
	FileText,
	History,
	Edit
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/models/$modelId")({
	component: ModelDetailComponent,
});

function ModelDetailComponent() {
	const { modelId } = Route.useParams();
	
	const { data: model, isLoading, error } = useQuery(
		orpc.getModel.queryOptions({
			input: { id: modelId }
		})
	);

	const { data: history } = useQuery(
		orpc.getModelHistory.queryOptions({
			input: { modelId, limit: 5 }
		})
	);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const formatFileSize = (bytes: number) => {
		const sizes = ['B', 'KB', 'MB', 'GB'];
		if (bytes === 0) return '0 B';
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
	};

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-7xl px-4 py-6">
				<div className="mb-6">
					<Skeleton className="h-8 w-48 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<Skeleton className="aspect-video" />
					<div className="space-y-4">
						<Skeleton className="h-32" />
						<Skeleton className="h-24" />
					</div>
				</div>
			</div>
		);
	}

	if (error || !model) {
		return (
			<div className="container mx-auto max-w-7xl px-4 py-6">
				<div className="text-center py-12">
					<div className="text-destructive mb-2">Failed to load model</div>
					<div className="text-muted-foreground text-sm">
						{error?.message || 'Model not found'}
					</div>
					<Button asChild className="mt-4">
						<Link to="/">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Library
						</Link>
					</Button>
				</div>
			</div>
		);
	}

	const latestVersion = model.versions[model.versions.length - 1];
	const totalSize = latestVersion.files.reduce((sum, file) => sum + file.size, 0);
	const mainModelFile = latestVersion.files.find(f => 
		['.stl', '.obj', '.3mf', '.ply'].includes(f.extension.toLowerCase())
	);

	return (
		<div className="container mx-auto max-w-7xl px-4 py-6">
			{/* Header */}
			<div className="mb-6">
				<div className="flex items-center gap-4 mb-4">
					<Button variant="ghost" size="sm" asChild>
						<Link to="/">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Library
						</Link>
					</Button>
				</div>
				
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold mb-2">{model.latestMetadata.name}</h1>
						{model.latestMetadata.description && (
							<p className="text-muted-foreground">{model.latestMetadata.description}</p>
						)}
					</div>
					<div className="flex gap-2">
						<Button variant="outline">
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</Button>
						<Button>
							<Download className="h-4 w-4 mr-2" />
							Download
						</Button>
					</div>
				</div>
			</div>

			{/* Main content */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				{/* 3D Viewer */}
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>3D Preview</CardTitle>
							<CardDescription>
								Interactive 3D view of {latestVersion.version}
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							{mainModelFile ? (
								<div className="aspect-video">
									<STLViewerWithSuspense
										modelId={model.id}
										version={latestVersion.version}
										filename={mainModelFile.filename}
										className="w-full h-full rounded-b-lg overflow-hidden"
									/>
								</div>
							) : (
								<div className="aspect-video flex items-center justify-center bg-muted rounded-b-lg">
									<div className="text-center text-muted-foreground">
										<FileText className="h-12 w-12 mx-auto mb-2" />
										<div>No 3D file available for preview</div>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Model Info */}
				<div className="space-y-4">
					{/* Metadata */}
					<Card>
						<CardHeader>
							<CardTitle>Model Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4 text-muted-foreground" />
									<div>
										<div className="font-medium">Created</div>
										<div className="text-muted-foreground">
											{formatDate(model.createdAt)}
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<HardDrive className="h-4 w-4 text-muted-foreground" />
									<div>
										<div className="font-medium">Size</div>
										<div className="text-muted-foreground">
											{formatFileSize(totalSize)}
										</div>
									</div>
								</div>
							</div>

							{/* Tags */}
							{model.latestMetadata.tags.length > 0 && (
								<div>
									<div className="flex items-center gap-2 mb-2">
										<Tag className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium text-sm">Tags</span>
									</div>
									<div className="flex flex-wrap gap-2">
										{model.latestMetadata.tags.map((tag) => (
											<Badge key={tag} variant="secondary">
												{tag}
											</Badge>
										))}
									</div>
								</div>
							)}

							{/* Print Settings */}
							{model.latestMetadata.printSettings && (
								<div>
									<div className="font-medium text-sm mb-2">Print Settings</div>
									<div className="space-y-1 text-sm text-muted-foreground">
										{model.latestMetadata.printSettings.material && (
											<div>Material: {model.latestMetadata.printSettings.material}</div>
										)}
										{model.latestMetadata.printSettings.layerHeight && (
											<div>Layer Height: {model.latestMetadata.printSettings.layerHeight}mm</div>
										)}
										{model.latestMetadata.printSettings.infill && (
											<div>Infill: {model.latestMetadata.printSettings.infill}%</div>
										)}
										{model.latestMetadata.printSettings.printTime && (
											<div>Print Time: {Math.floor(model.latestMetadata.printSettings.printTime / 60)}h {model.latestMetadata.printSettings.printTime % 60}m</div>
										)}
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Files */}
					<Card>
						<CardHeader>
							<CardTitle>Files ({latestVersion.version})</CardTitle>
							<CardDescription>
								{latestVersion.files.length} file{latestVersion.files.length !== 1 ? 's' : ''}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{latestVersion.files.map((file) => (
									<div key={file.filename} className="flex items-center justify-between p-2 border rounded">
										<div className="flex items-center gap-2">
											<FileText className="h-4 w-4 text-muted-foreground" />
											<div>
												<div className="font-medium text-sm">{file.filename}</div>
												<div className="text-xs text-muted-foreground">
													{formatFileSize(file.size)}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant="outline" className="text-xs">
												{file.extension.slice(1).toUpperCase()}
											</Badge>
											<Button size="sm" variant="ghost">
												<Download className="h-3 w-3" />
											</Button>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Versions and History */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Version History */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<History className="h-5 w-5" />
							Version History
						</CardTitle>
						<CardDescription>
							{model.totalVersions} version{model.totalVersions !== 1 ? 's' : ''}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{model.versions.reverse().map((version, index) => (
								<div key={version.version} className="flex items-start justify-between p-3 border rounded">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<Badge variant={index === 0 ? "default" : "outline"}>
												{version.version}
											</Badge>
											{index === 0 && (
												<Badge variant="secondary" className="text-xs">Current</Badge>
											)}
										</div>
										<div className="text-sm text-muted-foreground">
											{formatDate(version.createdAt)} • {version.files.length} files
										</div>
									</div>
									<Button size="sm" variant="outline">
										View
									</Button>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Git History */}
				<Card>
					<CardHeader>
						<CardTitle>Git History</CardTitle>
						<CardDescription>Recent commits for this model</CardDescription>
					</CardHeader>
					<CardContent>
						{history && history.length > 0 ? (
							<div className="space-y-3">
								{history.map((commit) => (
									<div key={commit.hash} className="p-3 border rounded">
										<div className="font-medium text-sm mb-1">
											{commit.message}
										</div>
										<div className="text-xs text-muted-foreground">
											{commit.author_name} • {formatDate(commit.date)}
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center text-muted-foreground py-4">
								No git history available
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}