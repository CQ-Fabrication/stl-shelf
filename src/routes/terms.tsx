import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Navigation } from '@/components/marketing/navigation'
import { Footer } from '@/components/marketing/sections'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: 'Terms of Service - STL Shelf' },
      {
        name: 'description',
        content: 'Terms of service for STL Shelf.',
      },
    ],
  }),
})

function TermsPage() {
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
                Terms of <span className="text-orange-500">Service</span>
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
              <h2>Agreement to Terms</h2>
              <p>
                By accessing or using STL Shelf ("Service"), you agree to be
                bound by these Terms of Service. If you disagree with any part
                of these terms, you do not have permission to access the
                Service.
              </p>

              <h2>Description of Service</h2>
              <p>
                STL Shelf is a 3D model library management platform that allows
                users to organize, preview, and manage their 3D printable files.
                The Service is available as:
              </p>
              <ul>
                <li>A cloud-hosted solution (subscription-based)</li>
                <li>A self-hosted open-source application</li>
              </ul>

              <h2>User Accounts</h2>
              <p>
                To use certain features of the Service, you must create an
                account. You are responsible for:
              </p>
              <ul>
                <li>Maintaining the confidentiality of your account</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>

              <h2>Acceptable Use</h2>
              <p>You agree not to use the Service to:</p>
              <ul>
                <li>Upload illegal content or content you don't have rights to</li>
                <li>Violate intellectual property rights of others</li>
                <li>Distribute malware or harmful code</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use the service for any illegal purpose</li>
                <li>Resell or redistribute the Service without permission</li>
              </ul>

              <h2>Intellectual Property</h2>

              <h3>Your Content</h3>
              <p>
                You retain all rights to the 3D models and files you upload. By
                uploading content, you grant us a limited license to store and
                display your content solely for the purpose of providing the
                Service.
              </p>

              <h3>Our Content</h3>
              <p>
                The Service, including its design, features, and code (excluding
                open-source components), is owned by STL Shelf and protected by
                intellectual property laws.
              </p>

              <h2>Subscription & Payments</h2>
              <p>For cloud-hosted users:</p>
              <ul>
                <li>
                  Subscriptions are billed monthly and renew automatically
                </li>
                <li>You may cancel at any time from your account settings</li>
                <li>Refunds are handled on a case-by-case basis</li>
                <li>
                  We reserve the right to change pricing with 30 days notice
                </li>
              </ul>

              <h2>Service Availability</h2>
              <p>
                We strive to maintain high availability but do not guarantee
                uninterrupted access. We may temporarily suspend the Service for
                maintenance, updates, or circumstances beyond our control.
              </p>

              <h2>Data & Backups</h2>
              <p>
                While we maintain regular backups, you are responsible for
                maintaining your own backups of important files. We recommend
                using the export feature regularly.
              </p>

              <h2>Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, STL Shelf shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages, including loss of data, profits, or goodwill.
              </p>

              <h2>Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless STL Shelf from any
                claims, damages, or expenses arising from your use of the
                Service or violation of these Terms.
              </p>

              <h2>Termination</h2>
              <p>
                We may terminate or suspend your account immediately, without
                prior notice, for conduct that we believe violates these Terms
                or is harmful to other users, us, or third parties.
              </p>
              <p>
                Upon termination, you may request export of your data within 30
                days.
              </p>

              <h2>Open Source License</h2>
              <p>
                The self-hosted version of STL Shelf is released under an open
                source license. Use of the self-hosted version is governed by
                that license rather than these Terms, except where these Terms
                specifically apply.
              </p>

              <h2>Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will
                provide notice of significant changes via email or through the
                Service. Continued use after changes constitutes acceptance of
                the new Terms.
              </p>

              <h2>Governing Law</h2>
              <p>
                These Terms are governed by applicable law, without regard to
                conflict of law principles.
              </p>

              <h2>Contact</h2>
              <p>
                For questions about these Terms, please contact us at{' '}
                <a
                  href="mailto:legal@stlshelf.com"
                  className="text-orange-500 hover:underline"
                >
                  legal@stlshelf.com
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
