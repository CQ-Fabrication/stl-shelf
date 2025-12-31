import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Navigation } from '@/components/marketing/navigation'
import { Footer } from '@/components/marketing/sections'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: 'Privacy Policy - STL Shelf' },
      {
        name: 'description',
        content: 'Privacy policy for STL Shelf - how we handle your data.',
      },
    ],
  }),
})

function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1 pt-24">
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
              backgroundSize: '40px 40px',
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
                  Legal
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/50" />
                </span>
              </div>

              <h1
                className="animate-fade-in-up text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                style={{ animationDelay: '0.1s' }}
              >
                Privacy <span className="text-orange-500">Policy</span>
              </h1>

              <p
                className="animate-fade-in-up text-muted-foreground"
                style={{ animationDelay: '0.2s' }}
              >
                Last updated: December 2024
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:text-muted-foreground prose-li:text-muted-foreground">
              <h2>Overview</h2>
              <p>
                STL Shelf ("we", "our", or "us") is committed to protecting your
                privacy. This Privacy Policy explains how we collect, use, and
                safeguard your information when you use our service.
              </p>
              <p>
                <strong>Self-Hosted Users:</strong> If you self-host STL Shelf,
                your data never touches our servers. This policy primarily
                applies to users of our cloud-hosted service.
              </p>

              <h2>Information We Collect</h2>

              <h3>Account Information</h3>
              <p>When you create an account, we collect:</p>
              <ul>
                <li>Email address</li>
                <li>Name (optional)</li>
                <li>Password (hashed, never stored in plain text)</li>
              </ul>

              <h3>Usage Data</h3>
              <p>We automatically collect:</p>
              <ul>
                <li>Storage usage and model counts</li>
                <li>Feature usage patterns (anonymized)</li>
                <li>Error logs for debugging purposes</li>
              </ul>

              <h3>Your 3D Models</h3>
              <p>
                Your uploaded 3D models are stored securely and are never:
              </p>
              <ul>
                <li>Shared with third parties</li>
                <li>Used for training AI models</li>
                <li>Accessed by our staff without explicit permission</li>
              </ul>

              <h2>How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul>
                <li>Provide and maintain the service</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send important service updates</li>
                <li>Improve our product based on usage patterns</li>
                <li>Respond to support requests</li>
              </ul>

              <h2>Data Storage & Security</h2>
              <p>
                Your data is stored on secure servers with encryption at rest
                and in transit. We use industry-standard security practices
                including:
              </p>
              <ul>
                <li>TLS 1.3 for all data transmission</li>
                <li>AES-256 encryption for stored files</li>
                <li>Regular security audits</li>
                <li>Access logging and monitoring</li>
              </ul>

              <h2>Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul>
                <li>
                  <strong>Polar.sh:</strong> Payment processing
                </li>
                <li>
                  <strong>Cloudflare:</strong> CDN and DDoS protection
                </li>
              </ul>

              <h2>Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal data</li>
                <li>Export your data at any time</li>
                <li>Delete your account and all associated data</li>
                <li>Opt out of non-essential communications</li>
              </ul>

              <h2>Data Retention</h2>
              <p>
                We retain your data for as long as your account is active. Upon
                account deletion, all your data is permanently removed within 30
                days.
              </p>

              <h2>Cookies</h2>
              <p>
                We use essential cookies only for authentication and session
                management. We do not use tracking cookies or third-party
                analytics that track you across websites.
              </p>

              <h2>Children's Privacy</h2>
              <p>
                STL Shelf is not intended for children under 13. We do not
                knowingly collect information from children under 13.
              </p>

              <h2>Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. We will notify you
                of any significant changes via email or through the service.
              </p>

              <h2>Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact
                us at{' '}
                <a
                  href="mailto:privacy@stlshelf.com"
                  className="text-orange-500 hover:underline"
                >
                  privacy@stlshelf.com
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
