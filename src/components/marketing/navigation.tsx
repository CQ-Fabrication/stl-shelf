"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";

const navItems = [
  { label: "Features", href: "/#features", scrollTo: "#features" },
  { label: "Pricing", href: "/pricing", scrollTo: null },
  { label: "About", href: "/about", scrollTo: null },
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const isHomePage = location.pathname === "/";

  // Prevent hydration mismatch by only showing auth state after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showLoading = !isMounted || isPending;
  const isAuthenticated = isMounted && !isPending && session?.user;

  const handleNavClick = (item: (typeof navItems)[0]) => {
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

  return (
    <>
      <nav className="fixed top-0 right-0 left-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto grid h-16 grid-cols-3 items-center px-4">
          {/* Logo - Left */}
          <Link className="flex items-center" to="/">
            <Logo className="h-8" />
          </Link>

          {/* Nav Items - Center */}
          <div className="hidden items-center justify-center space-x-8 md:flex">
            {navItems.map((item) =>
              isHomePage && item.scrollTo ? (
                <button
                  className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
                  key={item.href}
                  onClick={() => handleNavClick(item)}
                  type="button"
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
                  key={item.href}
                  to={item.href}
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>

          {/* Auth Buttons - Right */}
          <div className="hidden md:flex items-center justify-end gap-3">
            {showLoading ? (
              /* Skeleton placeholder to prevent layout shift and hydration mismatch */
              <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
            ) : isAuthenticated ? (
              <Button asChild className="animate-in fade-in duration-200">
                <Link to="/library">
                  Go to Library
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

          <button
            aria-label="Toggle menu"
            className="rounded-lg p-2 transition-colors hover:bg-accent md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMobileMenuOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />

          <div className="fixed top-16 right-0 bottom-0 left-0 z-40 overflow-y-auto border-t bg-background md:hidden">
            <div className="container mx-auto space-y-6 px-4 py-8">
              {navItems.map((item) =>
                isHomePage && item.scrollTo ? (
                  <button
                    className="block w-full py-3 text-left font-medium text-lg transition-colors hover:text-primary"
                    key={item.href}
                    onClick={() => handleNavClick(item)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    className="block w-full py-3 text-left font-medium text-lg transition-colors hover:text-primary"
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ),
              )}

              <div className="pt-4 space-y-3">
                {showLoading ? (
                  <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
                ) : isAuthenticated ? (
                  <Button className="w-full" asChild>
                    <Link to="/library" onClick={() => setMobileMenuOpen(false)}>
                      Go to Library
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
