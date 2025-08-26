import { Link } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";

export default function Header() {
	const links = [
		{ to: "/", label: "Library" },
		{ to: "/upload", label: "Upload" }
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-4 py-3">
				<div className="flex items-center gap-6">
					<Link to="/" className="text-xl font-bold">
						STL Shelf
					</Link>
					<nav className="flex gap-4">
						{links.map(({ to, label }) => {
							return (
								<Link 
									key={to} 
									to={to}
									className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
									activeProps={{ className: "text-foreground" }}
								>
									{label}
								</Link>
							);
						})}
					</nav>
				</div>
				<div className="flex items-center gap-2">
					<Button size="sm" asChild>
						<Link to="/upload">
							<Plus className="h-4 w-4 mr-2" />
							Upload
						</Link>
					</Button>
					<ModeToggle />
				</div>
			</div>
			<hr />
		</div>
	);
}
