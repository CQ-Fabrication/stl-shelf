import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { X, Search, Tag } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuCheckboxItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface ModelSearchProps {
	defaultSearch?: string;
	defaultTags?: string[];
	onSearchChange?: (search: string, tags: string[]) => void;
}

export function ModelSearch({ 
	defaultSearch = "", 
	defaultTags = [],
	onSearchChange 
}: ModelSearchProps) {
	const [searchInput, setSearchInput] = useState(defaultSearch);
	const [selectedTags, setSelectedTags] = useState<string[]>(defaultTags);
	
	// Debounced search
	const [debouncedSearch, setDebouncedSearch] = useState(defaultSearch);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchInput);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchInput]);

	// Notify parent of changes
	useEffect(() => {
		onSearchChange?.(debouncedSearch, selectedTags);
	}, [debouncedSearch, selectedTags, onSearchChange]);

	// Fetch available tags
	const { data: allTags = [] } = useQuery(orpc.getAllTags.queryOptions({}));

	const handleTagToggle = (tag: string) => {
		setSelectedTags(prev => 
			prev.includes(tag)
				? prev.filter(t => t !== tag)
				: [...prev, tag]
		);
	};

	const handleClearSearch = () => {
		setSearchInput("");
		setDebouncedSearch("");
	};

	const handleClearTag = (tag: string) => {
		setSelectedTags(prev => prev.filter(t => t !== tag));
	};

	const handleClearAll = () => {
		setSearchInput("");
		setDebouncedSearch("");
		setSelectedTags([]);
	};

	const hasFilters = debouncedSearch || selectedTags.length > 0;

	return (
		<div className="space-y-3">
			{/* Search input */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search models..."
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					className="pl-10 pr-10"
				/>
				{searchInput && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClearSearch}
						className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
					>
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>

			{/* Filters row */}
			<div className="flex flex-wrap items-center gap-2">
				{/* Tag filter dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<Tag className="h-4 w-4 mr-2" />
							Tags
							{selectedTags.length > 0 && (
								<Badge variant="secondary" className="ml-2 h-5 px-1 text-xs">
									{selectedTags.length}
								</Badge>
							)}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-48">
						{allTags.length === 0 ? (
							<div className="p-2 text-sm text-muted-foreground">No tags available</div>
						) : (
							allTags.map((tag) => (
								<DropdownMenuCheckboxItem
									key={tag}
									checked={selectedTags.includes(tag)}
									onCheckedChange={() => handleTagToggle(tag)}
								>
									{tag}
								</DropdownMenuCheckboxItem>
							))
						)}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Selected tags */}
				{selectedTags.map((tag) => (
					<Badge key={tag} variant="secondary" className="gap-1">
						{tag}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleClearTag(tag)}
							className="h-auto w-auto p-0 hover:bg-transparent"
						>
							<X className="h-3 w-3" />
						</Button>
					</Badge>
				))}

				{/* Clear all filters */}
				{hasFilters && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClearAll}
						className="text-muted-foreground hover:text-foreground"
					>
						Clear all
					</Button>
				)}
			</div>
		</div>
	);
}