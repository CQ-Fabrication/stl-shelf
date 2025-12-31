"use client"

import { Link } from "@tanstack/react-router"
import { Button } from "@stl-shelf/ui/components/button"
import { Logo } from "@stl-shelf/ui/components/logo"
import { Menu, X } from "lucide-react"
import { useState } from "react"

const navItems = [
  { label: "Features", href: "#features", isRoute: false },
  { label: "Pricing", href: "#pricing", isRoute: false },
  { label: "About", href: "/about", isRoute: true },
  { label: "Contact", href: "/contact", isRoute: true },
]

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
      setMobileMenuOpen(false)
    }
  }

  return (
    <>
      <nav className="fixed top-0 right-0 left-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <a className="flex items-center" href="/">
            <Logo className="h-8" />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 md:flex">
            {navItems.map((item) =>
              item.isRoute ? (
                <Link
                  className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
                  key={item.href}
                  to={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
                  key={item.href}
                  onClick={() => scrollToSection(item.href)}
                  type="button"
                >
                  {item.label}
                </button>
              )
            )}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <Button asChild>
              <a href="#get-started">Get Started</a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            aria-label="Toggle menu"
            className="rounded-lg p-2 transition-colors hover:bg-accent md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMobileMenuOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />

          {/* Menu Panel */}
          <div className="fixed top-16 right-0 bottom-0 left-0 z-40 overflow-y-auto border-t bg-background md:hidden">
            <div className="container mx-auto space-y-6 px-4 py-8">
              {navItems.map((item) =>
                item.isRoute ? (
                  <Link
                    className="block w-full py-3 text-left font-medium text-lg transition-colors hover:text-primary"
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    className="block w-full py-3 text-left font-medium text-lg transition-colors hover:text-primary"
                    key={item.href}
                    onClick={() => scrollToSection(item.href)}
                    type="button"
                  >
                    {item.label}
                  </button>
                )
              )}

              <div className="pt-4">
                <Button asChild className="w-full">
                  <a href="#get-started">Get Started</a>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
