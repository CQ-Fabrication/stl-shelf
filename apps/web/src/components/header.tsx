import { Link } from '@tanstack/react-router';
import { Laptop, LogOut, Moon, Plus, Sun, User } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import type { RouterAppContext } from '@/routes/__root';
import { Button } from './ui/button';
import { Logo } from './logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './ui/dropdown-menu';
import { useTheme } from './theme-provider';

export default function Header() {
  const router = useRouter();
  const { auth } = router.options.context as RouterAppContext;
  const { setTheme } = useTheme();
  // No left-side nav links; just the brand logo

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="STL Shelf home" className="flex items-center">
            <Logo className="h-8" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link to="/upload">
              <Plus className="mr-2 h-4 w-4" />
              Upload
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" aria-label="User menu">
                <User className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sun /> Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Laptop /> System
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => {
                  try {
                    await auth.signOut();
                    await router.invalidate();
                  } catch {
                    // ignore
                  }
                }}
              >
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <hr />
    </div>
  );
}
