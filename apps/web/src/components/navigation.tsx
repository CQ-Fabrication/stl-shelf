import { Button } from "@stl-shelf/ui/components/button";
import { Logo } from "@stl-shelf/ui/components/logo";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { fadeInDown, slideInLeft } from "@/lib/animation-variants";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      <motion.nav
        animate="visible"
        className="fixed top-0 right-0 left-0 z-50 border-b bg-background/80 backdrop-blur-lg"
        initial="hidden"
        variants={fadeInDown}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <a className="flex items-center" href="/">
            <Logo className="h-8" />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 md:flex">
            {navItems.map((item) => (
              <button
                className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
                key={item.href}
                onClick={() => scrollToSection(item.href)}
                type="button"
              >
                {item.label}
              </button>
            ))}
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
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              animate="visible"
              className="fixed top-16 right-0 bottom-0 left-0 z-40 overflow-y-auto border-t bg-background md:hidden"
              exit="exit"
              initial="hidden"
              variants={slideInLeft}
            >
              <div className="container mx-auto space-y-6 px-4 py-8">
                {navItems.map((item, index) => (
                  <motion.button
                    animate={{ opacity: 1, x: 0 }}
                    className="block w-full py-3 text-left font-medium text-lg transition-colors hover:text-primary"
                    initial={{ opacity: 0, x: -20 }}
                    key={item.href}
                    onClick={() => scrollToSection(item.href)}
                    transition={{ delay: index * 0.1 }}
                    type="button"
                  >
                    {item.label}
                  </motion.button>
                ))}

                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="pt-4"
                  initial={{ opacity: 0, x: -20 }}
                  transition={{ delay: navItems.length * 0.1 }}
                >
                  <Button asChild className="w-full">
                    <a href="#get-started">Get Started</a>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
