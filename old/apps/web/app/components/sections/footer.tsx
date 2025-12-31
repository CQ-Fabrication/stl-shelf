import { Link } from "@tanstack/react-router"
import { Logo } from "@stl-shelf/ui/components/logo"
import { Github, Twitter } from "lucide-react"

const footerLinks = {
  product: [
    { label: "Features", href: "/#features", isExternal: false },
    { label: "Pricing", href: "/#pricing", isExternal: false },
    { label: "Documentation", href: "#docs", isExternal: false },
    { label: "Changelog", href: "#changelog", isExternal: false },
  ],
  company: [
    { label: "About", href: "/about", isExternal: false },
    { label: "Blog", href: "#blog", isExternal: false },
    { label: "Contact", href: "/contact", isExternal: false },
  ],
  legal: [
    { label: "Privacy", href: "/privacy", isExternal: false },
    { label: "Terms", href: "/terms", isExternal: false },
  ],
}

const socialLinks = [
  { icon: Github, href: "https://github.com", label: "GitHub" },
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
]

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-card/30">
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.01]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <a href="/" className="inline-block mb-4">
              <Logo className="h-8" />
            </a>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Self-hosted 3D model library management for makers who care about
              their data.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border/50 bg-background/50 text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-foreground"
                >
                  <link.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) =>
                link.href.startsWith("/") && !link.href.startsWith("/#") ? (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ) : (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) =>
                link.href.startsWith("/") && !link.href.startsWith("/#") ? (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ) : (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) =>
                link.href.startsWith("/") && !link.href.startsWith("/#") ? (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ) : (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" suppressHydrationWarning>
              &copy; {new Date().getFullYear()} STL Shelf. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Made with care for the maker community
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
