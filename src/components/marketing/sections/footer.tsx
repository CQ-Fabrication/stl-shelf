import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/ui/logo";
import { Github } from "lucide-react";

// Custom Bluesky icon
function BlueskyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
    </svg>
  );
}

const navLinks = [
  { label: "Features", href: "/#features", isExternal: false },
  { label: "Pricing", href: "/pricing", isExternal: false },
  { label: "About", href: "/about", isExternal: false },
  { label: "Contact", href: "mailto:hello@stl-shelf.com", isExternal: true },
];

const socialLinks = [
  {
    label: "GitHub",
    href: "https://github.com/CQ-Fabrication/stl-shelf",
    icon: Github,
  },
  {
    label: "Bluesky",
    href: "https://bsky.app/profile/cqfabrication.com",
    icon: BlueskyIcon,
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-4">
        {/* Main footer content */}
        <div className="py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          {/* Brand */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <Logo className="h-7" />
            <span className="hidden sm:block h-4 w-px bg-border" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">3D model library for makers</p>
          </div>

          {/* Navigation */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {navLinks.map((link) =>
              link.isExternal ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}
            <span className="hidden sm:block h-4 w-px bg-border" aria-hidden="true" />
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={link.label}
              >
                <link.icon className="h-4 w-4" />
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/40 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>&copy; {new Date().getFullYear()} STL Shelf</span>
            <span className="hidden sm:inline">·</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <span>·</span>
            <span className="text-muted-foreground/60">v{__APP_VERSION__}</span>
          </div>
          <p className="flex items-center gap-1.5">
            Made with
            <span className="text-orange-500" aria-label="love">
              ♥
            </span>
            for makers
          </p>
        </div>
      </div>
    </footer>
  );
}
