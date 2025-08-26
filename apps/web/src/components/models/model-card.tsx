import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { MoreVertical, Download, Eye, Calendar, HardDrive } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Link } from "@tanstack/react-router";

// Import types from server
import type { Model } from "../../../../server/src/types/model";

interface ModelCardProps {
	model: Model;
}

export function ModelCard({ model }: ModelCardProps) {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	const formatFileSize = (bytes: number) => {
		const sizes = ['B', 'KB', 'MB', 'GB'];
		if (bytes === 0) return '0 B';
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
	};

	const getTotalSize = () => {
		return model.versions[model.versions.length - 1].files.reduce(
			(sum, file) => sum + file.size, 
			0
		);
	};

	const latestVersion = model.versions[model.versions.length - 1];
	const thumbnailUrl = latestVersion.thumbnailPath 
		? `${import.meta.env.VITE_SERVER_URL}/thumbnails/${model.id}/${latestVersion.version}`
		: null;

	return (
		<Card className="group hover:shadow-md transition-shadow">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between">
					<div className="space-y-1 flex-1">
						<CardTitle className="text-lg line-clamp-2">
							{model.latestMetadata.name}
						</CardTitle>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Calendar className="h-3 w-3" />
							{formatDate(model.updatedAt)}
							<HardDrive className="h-3 w-3 ml-2" />
							{formatFileSize(getTotalSize())}
						</div>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button 
								variant="ghost" 
								size="sm" 
								className="opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem asChild>
								<Link to="/models/$modelId" params={{ modelId: model.id }}>
									<Eye className="h-4 w-4 mr-2" />
									View Details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Download className="h-4 w-4 mr-2" />
								Download
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>
			<CardContent>
				{/* Thumbnail preview */}
				<div className="mb-3">
					<Link to="/models/$modelId" params={{ modelId: model.id }}>
						<div className="aspect-video bg-muted rounded-md overflow-hidden cursor-pointer hover:bg-muted/80 transition-colors">
							{thumbnailUrl ? (
								<img 
									src={thumbnailUrl}
									alt={`${model.latestMetadata.name} preview`}
									className="w-full h-full object-cover"
									loading="lazy"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center text-muted-foreground">
									<div className="text-center">
										<HardDrive className="h-8 w-8 mx-auto mb-2" />
										<div className="text-sm">No Preview</div>
									</div>
								</div>
							)}
						</div>
					</Link>
				</div>

				{/* Description */}
				{model.latestMetadata.description && (
					<CardDescription className="line-clamp-2 mb-3">
						{model.latestMetadata.description}
					</CardDescription>
				)}

				{/* Tags */}
				{model.latestMetadata.tags.length > 0 && (
					<div className="flex flex-wrap gap-1 mb-3">
						{model.latestMetadata.tags.slice(0, 3).map((tag) => (
							<Badge key={tag} variant="secondary" className="text-xs">
								{tag}
							</Badge>
						))}
						{model.latestMetadata.tags.length > 3 && (
							<Badge variant="secondary" className="text-xs">
								+{model.latestMetadata.tags.length - 3}
							</Badge>
						)}
					</div>
				)}

				{/* File info */}
				<div className="flex items-center justify-between text-sm text-muted-foreground">
					<div className="flex items-center gap-2">
						<span>{latestVersion.files.length} file{latestVersion.files.length !== 1 ? 's' : ''}</span>
						{model.totalVersions > 1 && (
							<span>• v{model.totalVersions}</span>
						)}
					</div>
					<div className="flex gap-1">
						{latestVersion.files.slice(0, 2).map((file) => (
							<Badge key={file.filename} variant="outline" className="text-xs">
								{file.extension.slice(1).toUpperCase()}
							</Badge>
						))}
						{latestVersion.files.length > 2 && (
							<Badge variant="outline" className="text-xs">
								+{latestVersion.files.length - 2}
							</Badge>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}