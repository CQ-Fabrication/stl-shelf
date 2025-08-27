import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { ModeToggle } from './mode-toggle';
import { Button } from './ui/button';

export default function Header() {
  const links = [
    { to: '/', label: 'Library' },
    { to: '/upload', label: 'Upload' },
  ] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link className="font-bold text-xl" to="/">
            STL Shelf
          </Link>
          <nav className="flex gap-4">
            {links.map(({ to, label }) => {
              return (
                <Link
                  activeProps={{ className: 'text-foreground' }}
                  className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
                  key={to}
                  to={to}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link to="/upload">
              <Plus className="mr-2 h-4 w-4" />
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
