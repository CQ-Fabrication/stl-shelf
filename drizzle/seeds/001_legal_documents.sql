-- Seed initial legal documents for consent management
-- These documents are required for the application to function
-- Uses PostgreSQL dollar quoting for multi-line content

INSERT INTO "legal_documents" ("id", "type", "version", "content", "published_at", "created_at") VALUES
(
  gen_random_uuid(),
  'terms_and_conditions',
  '2026-02-05',
  $body$# Terms of Service

**Effective Date:** February 5, 2026

## 1. Acceptance of Terms

By accessing or using STL Shelf ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.

## 2. Description of Service

STL Shelf is a personal and team library for 3D printable models. The Service allows you to upload, organize, tag, version, preview, and manage your 3D model files and related metadata (including print profiles and changelogs). We offer a cloud-hosted service and may also offer a self-hosted option.

## 3. User Accounts

- You must provide accurate information when creating an account
- You are responsible for maintaining the security of your account credentials
- You must notify us immediately of any unauthorized access to your account
- You may not share your account credentials with others
- Organization, seat, and membership limits may apply by plan

## 4. Acceptable Use

You agree NOT to:
- Upload content that infringes on intellectual property rights
- Upload malicious files or content
- Attempt to gain unauthorized access to the Service
- Use the Service for any illegal purpose
- Resell or redistribute the Service without authorization

## 5. Content Ownership

- You retain all ownership rights to content you upload
- By uploading content, you grant us a limited license to store, process, and display your content solely to provide the Service (including generating previews, thumbnails, and extracting metadata)
- We do not claim ownership of your 3D models or files
- We will never use your content for training AI models

## 6. Storage, Usage Limits, and Retention

- Storage limits are determined by your subscription tier
- If your subscription ends or downgrades and your usage exceeds free limits, your account enters read-only mode for 7 days ("Grace Period")
- During the Grace Period you may download data but cannot upload or modify content
- After the Grace Period, we may remove content above free limits (oldest first) and complete removal within 7 days unless you upgrade
- For our cloud-hosted service, data is stored on servers in Europe
- We use industry-standard security controls, including encryption in transit and at rest where supported by our storage providers
- STL Shelf is not a backup service. Do not rely on the Service as your sole storage.
- You are responsible for maintaining independent backups of important files, and we are not liable for loss, corruption, or deletion of content
- If you self-host the Service, you are responsible for your hosting environment and data storage

## 7. Payment and Subscriptions

- Paid features require an active subscription
- Subscriptions auto-renew unless cancelled before the renewal date
- Refunds are handled on a case-by-case basis
- Price changes will be communicated 30 days in advance

## 8. Service Availability

- We strive for 99.9% uptime but do not guarantee uninterrupted service
- We may perform maintenance with reasonable notice
- We reserve the right to modify or discontinue features

## 9. Termination

- You may delete your account at any time
- We may suspend or terminate accounts that violate these Terms
- Upon account deletion, your data will be scheduled for removal within 7 days
- If you own an organization, deleting your account deletes the organization and all associated models and files

## 10. Limitation of Liability

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.

## 11. Changes to Terms

We may update these Terms from time to time. We will notify you of significant changes via email or through the Service. Continued use after changes constitutes acceptance.

## 12. Governing Law

These Terms are governed by the laws of the European Union and Italy.

## 13. Contact

For questions about these Terms, contact us at legal@stlshelf.com.$body$,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'privacy_policy',
  '2026-02-05',
  $body$# Privacy Policy

**Effective Date:** February 5, 2026

## Overview

STL Shelf ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service.

**Self-Hosted Users:** If you self-host STL Shelf, your data never touches our servers. This policy primarily applies to users of our cloud-hosted service.

## Information We Collect

### Account Information

When you create an account, we collect:
- Email address
- Name
- Password (hashed, never stored in plain text)
- Profile image/avatar (optional)

### Organization Information

When you create or manage an organization, we collect:
- Organization name and slug
- Organization website (optional)
- Organization logo (optional)
- Membership role and invitations (including invitee email)

### Usage Data

We automatically collect:
- Storage usage and model counts
- Feature usage patterns (product analytics when enabled)
- Error logs for debugging purposes

### Consent Audit Data

When you accept our Terms of Service or update your consent preferences, we collect:
- IP address
- User agent (browser/device information)
- Timestamp of consent
- **Device fingerprint** - A hash generated from your device characteristics (canvas rendering, screen properties) used solely to verify consent authenticity and prevent fraud. This fingerprint is stored only in our consent audit log and is never used for tracking, advertising, or cross-site identification.

### Your 3D Models

Your uploaded 3D models and related metadata (tags, descriptions, changelogs, print profiles, preview images, and thumbnails) are stored securely and are:
- Used only to provide the Service
- Never used for training AI models
- Not accessed by our staff without explicit permission, except as required to provide support or ensure service reliability

### Technical and Security Data

We collect:
- Session and authentication data (session tokens, login timestamps)
- IP address and user agent for security, rate limiting, and abuse prevention

### Billing Data

If you subscribe to a paid plan, we collect:
- Subscription tier and status
- Customer and subscription IDs from our payment processor
- Billing webhook records needed for reconciliation and support

## How We Use Your Information

We use your information to:
- Provide and maintain the service
- Process payments and manage subscriptions
- Send important service updates
- Improve our product based on usage patterns
- Respond to support requests
- Demonstrate GDPR compliance through consent audit trails

## Data Storage & Security

For our cloud-hosted service, your data is stored on servers located in Europe. We implement industry-standard security measures including:
- Encryption in transit and at rest (where supported by our storage providers)
- Access logging and monitoring

If you self-host STL Shelf, you control your data storage location and security configuration.

## Third-Party Services

We use the following third-party services:
- **Polar.sh:** Payment processing
- **Cloudflare:** CDN, DDoS protection, and Turnstile (captcha)
- **Resend:** Transactional emails
- **OpenPanel:** Product analytics (when enabled)
- **Sentry / Better Stack:** Error tracking and server logs

If you use third-party login providers (e.g., Google or GitHub), we receive basic profile information (such as your email and name) from that provider.

## Your Rights

Under GDPR, you have the right to:
- **Access:** Request a copy of your personal data
- **Rectification:** Correct inaccurate personal data
- **Erasure:** Delete your account and all associated data
- **Portability:** Export your data in a machine-readable format
- **Objection:** Object to processing based on legitimate interests
- **Withdraw Consent:** Change your marketing preferences at any time

To exercise these rights, visit your Profile Settings or contact us at privacy@stlshelf.com.

## Data Retention

- Account data is retained while your account is active
- Upon account deletion, personal data is scheduled for removal within 7 days
- Consent audit logs are retained for legal compliance and may be retained indefinitely
- Billing records and audit logs are retained as required by law or for dispute resolution
- Content above free limits may be removed according to the Grace Period and retention rules described in the Terms of Service

## Cookies

We use essential cookies and local storage only for:
- Authentication and session management
- Remembering your preferences and consent state

We do not use advertising cookies or track you across unrelated websites.

## Children's Privacy

STL Shelf is not intended for children under 16. We do not knowingly collect information from children under 16.

## International Transfers

Your data is stored in Europe for our cloud-hosted service. Some third-party processors may process data outside your residence. We ensure appropriate safeguards are in place for any international transfers.

## Changes to This Policy

We may update this policy from time to time. We will notify you of significant changes via email or through the service. The consent banner will appear when terms are updated, requiring your re-acceptance.

## Contact Us

For questions about this Privacy Policy or to exercise your data rights, contact us at:
- Email: privacy@stlshelf.com
- Address: CQ Fabrication, Italy$body$,
  NOW(),
  NOW()
);
