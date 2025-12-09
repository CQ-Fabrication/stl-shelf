import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Github, Mail, MessageSquare, Twitter } from "lucide-react"
import { Button } from "@stl-shelf/ui/components/button"
import { Navigation } from "~/components/navigation"
import { Footer } from "~/components/sections"

export const Route = createFileRoute("/contact")({
  component: ContactPage,
})

const contactMethods = [
  {
    icon: Github,
    title: "GitHub Issues",
    description: "For bug reports and feature requests",
    action: "Open an Issue",
    href: "https://github.com",
    primary: true,
  },
  {
    icon: MessageSquare,
    title: "GitHub Discussions",
    description: "For questions and community support",
    action: "Start a Discussion",
    href: "https://github.com",
    primary: false,
  },
  {
    icon: Twitter,
    title: "Twitter / X",
    description: "For updates and quick questions",
    action: "@stlshelf",
    href: "https://twitter.com",
    primary: false,
  },
  {
    icon: Mail,
    title: "Email",
    description: "For business inquiries only",
    action: "hello@stlshelf.com",
    href: "mailto:hello@stlshelf.com",
    primary: false,
  },
]

function ContactPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-24">
        {/* Hero */}
        <section className="relative py-16 overflow-hidden">
          {/* Isometric grid */}
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(30deg, hsl(var(--foreground)) 1px, transparent 1px),
                linear-gradient(150deg, hsl(var(--foreground)) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />

          <div className="container mx-auto px-4 relative z-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>

            <div className="max-w-3xl">
              <div className="animate-fade-in-up">
                <span className="inline-flex items-center gap-2 text-sm font-mono font-medium text-orange-500 mb-4 tracking-wider uppercase">
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500/50" />
                  Contact
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/50" />
                </span>
              </div>

              <h1
                className="animate-fade-in-up text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                style={{ animationDelay: "0.1s" }}
              >
                Get in <span className="text-orange-500">Touch</span>
              </h1>

              <p
                className="animate-fade-in-up text-lg md:text-xl text-muted-foreground mb-8"
                style={{ animationDelay: "0.2s" }}
              >
                Have a question, found a bug, or want to contribute? Here's how
                to reach us.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {contactMethods.map((method, index) => (
                <a
                  key={method.title}
                  href={method.href}
                  target={method.href.startsWith("mailto") ? undefined : "_blank"}
                  rel={method.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                  className="animate-fade-in-up group block p-6 rounded-xl border border-border/50 bg-card/50 transition-all duration-300 hover:border-orange-500/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)]"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20 transition-colors">
                      <method.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{method.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {method.description}
                      </p>
                      <span className="text-sm font-medium text-orange-500 group-hover:underline">
                        {method.action}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Callout */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-4">
                Before You Reach Out...
              </h2>
              <p className="text-muted-foreground mb-8">
                Many common questions are answered in our documentation. Check
                there first - you might find your answer faster!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="outline" size="lg" asChild>
                  <a href="#docs" className="flex items-center gap-2">
                    View Documentation
                  </a>
                </Button>
                <Button variant="ghost" size="lg" asChild>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Github className="h-4 w-4" />
                    Browse FAQ
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Response Time */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="p-6 rounded-xl border border-border/50 bg-card/50">
                <h3 className="font-semibold mb-3">Response Times</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span>
                      <strong>GitHub Issues:</strong> We aim to triage within
                      48 hours
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span>
                      <strong>GitHub Discussions:</strong> Community-driven,
                      usually same day
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span>
                      <strong>Email:</strong> 3-5 business days for business
                      inquiries
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
