import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Logo } from "@/components/ui/logo";
import type { AuthClient } from "@/lib/auth-client";

type NavItem = {
  label: string;
  to: string;
  hash?: string;
  scrollTo?: string;
};

const navItems: NavItem[] = [
  { label: "Features", to: "/", hash: "features", scrollTo: "#features" },
  { label: "Guides", to: "/", hash: "guides", scrollTo: "#guides" },
  { label: "Pricing", to: "/", hash: "pricing", scrollTo: "#pricing" },
  { label: "About", to: "/about" },
];

type Session = AuthClient["$Infer"]["Session"];

type NavigationProps = {
  session?: Session | null;
};

export function Navigation({ session }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const isAuthenticated = Boolean(session?.user);
  const showDashboardCta = isAuthenticated;

  const handleNavClick = (item: NavItem) => {
    setMobileMenuOpen(false);

    // If on homepage and item has scrollTo, scroll to section
    if (isHomePage && item.scrollTo) {
      const element = document.querySelector(item.scrollTo);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        return true;
      }
    }
    return false;
  };

  const handleLogoClick = () => {
    if (isHomePage) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 right-0 left-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto grid h-16 grid-cols-[auto_1fr_auto] items-center px-4">
          {/* Logo - Left */}
          <Link className="flex items-center" onClick={handleLogoClick} to="/">
            <Logo className="h-8" />
          </Link>

          {/* Nav Items - Center */}
          <div className="hidden items-center justify-center space-x-8 md:flex">
            {navItems.map((item) =>
              isHomePage && item.scrollTo ? (
                <button
                  className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
                  key={item.label}
                  onClick={() => handleNavClick(item)}
                  type="button"
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
                  hash={item.hash}
                  key={item.label}
                  to={item.to}
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>

          {/* Auth Buttons - Right */}
          <div className="flex items-center justify-end gap-2">
            <div className="hidden md:flex items-center gap-3">
              {showDashboardCta ? (
                <Button asChild className="animate-in fade-in duration-200">
                  <Link to="/library">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <div className="flex items-center gap-3 animate-in fade-in duration-200">
                  <Button variant="ghost" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </div>
              )}
            </div>
            <AnimatedThemeToggler variant="icon" />
            <button
              aria-label="Toggle menu"
              className="rounded-lg p-2 transition-colors hover:bg-accent md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default border-0 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMobileMenuOpen(false)}
            type="button"
          />

          <div className="fixed top-16 right-0 bottom-0 left-0 z-40 overflow-y-auto border-t bg-background md:hidden">
            <div className="container mx-auto space-y-6 px-4 py-8">
              {navItems.map((item) =>
                isHomePage && item.scrollTo ? (
                  <button
                    className="block w-full py-3 text-left font-medium text-lg transition-colors hover:text-primary"
                    key={item.label}
                    onClick={() => handleNavClick(item)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    className="block w-full py-3 text-left font-medium text-lg transition-colors hover:text-primary"
                    hash={item.hash}
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ),
              )}

              <div className="pt-4 space-y-3">
                {showDashboardCta ? (
                  <Button className="w-full" asChild>
                    <Link to="/library" onClick={() => setMobileMenuOpen(false)}>
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        Sign In
                      </Link>
                    </Button>
                    <Button className="w-full" asChild>
                      <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                        Get Started
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
