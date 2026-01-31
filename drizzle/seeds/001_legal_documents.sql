-- Seed initial legal documents for consent management
-- These documents are required for the application to function
-- Uses PostgreSQL dollar quoting for multi-line content

INSERT INTO "legal_documents" ("id", "type", "version", "content", "published_at", "created_at") VALUES
(
  gen_random_uuid(),
  'terms_and_conditions',
  '1.0',
  $body$# Terms of Service

**Effective Date:** January 27, 2026

## 1. Acceptance of Terms

By accessing or using STL Shelf ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.

## 2. Description of Service

STL Shelf is a personal library management application for 3D printable models. The Service allows you to upload, organize, version, and manage your 3D model files.

## 3. User Accounts

- You must provide accurate information when creating an account
- You are responsible for maintaining the security of your account credentials
- You must notify us immediately of any unauthorized access to your account
- One person or entity may not maintain more than one account

## 4. Acceptable Use

You agree NOT to:
- Upload content that infringes on intellectual property rights
- Upload malicious files or content
- Attempt to gain unauthorized access to the Service
- Use the Service for any illegal purpose
- Share your account credentials with others
- Resell or redistribute the Service without authorization

## 5. Content Ownership

- You retain all ownership rights to content you upload
- By uploading content, you grant us a limited license to store and display your content to you
- We do not claim ownership of your 3D models or files
- We will never use your content for training AI models

## 6. Storage and Data

- Storage limits are determined by your subscription tier
- If your subscription ends or downgrades and your usage exceeds free limits, your account enters read-only mode for 7 days ("Grace Period")
- During the Grace Period you may download data but cannot upload or modify content
- After the Grace Period, we may remove content above free limits (oldest first) and complete removal within 7 days unless you upgrade
- We use industry-standard encryption for data at rest and in transit
- You are responsible for maintaining backups of your important files
- We may delete content from inactive accounts after 12 months of inactivity

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
- Upon termination, your data will be deleted within 7 days

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
  '1.0',
  $body$# Privacy Policy

**Effective Date:** January 27, 2026

## Overview

STL Shelf ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service.

**Self-Hosted Users:** If you self-host STL Shelf, your data never touches our servers. This policy primarily applies to users of our cloud-hosted service.

## Information We Collect

### Account Information

When you create an account, we collect:
- Email address
- Name (optional)
- Password (hashed, never stored in plain text)

### Usage Data

We automatically collect:
- Storage usage and model counts
- Feature usage patterns (anonymized)
- Error logs for debugging purposes

### Consent Audit Data

When you accept our Terms of Service or update your consent preferences, we collect:
- IP address
- User agent (browser/device information)
- Timestamp of consent
- **Device fingerprint** - A hash generated from your device characteristics (canvas rendering, screen properties) used solely to verify consent authenticity and prevent fraud. This fingerprint is stored only in our consent audit log and is never used for tracking, advertising, or cross-site identification.

### Your 3D Models

Your uploaded 3D models are stored securely and are never:
- Shared with third parties
- Used for training AI models
- Accessed by our staff without explicit permission

## How We Use Your Information

We use your information to:
- Provide and maintain the service
- Process payments and manage subscriptions
- Send important service updates
- Improve our product based on usage patterns
- Respond to support requests
- Demonstrate GDPR compliance through consent audit trails

## Data Storage & Security

Your data is stored on secure cloud servers. We implement industry-standard security measures including:
- TLS 1.3 for all data transmission
- AES-256 encryption for stored files
- Regular security audits
- Access logging and monitoring

## Third-Party Services

We use the following third-party services:
- **Polar.sh:** Payment processing
- **Cloudflare:** CDN and DDoS protection
- **Resend:** Transactional emails

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
- Upon account deletion, personal data is removed within 7 days
- Consent audit logs are retained for 7 years for legal compliance
- Anonymized usage analytics may be retained indefinitely
- Content above free limits may be removed according to the Grace Period and retention rules described in the Terms of Service

## Cookies

We use essential cookies only for:
- Authentication and session management
- Remembering your preferences (theme, etc.)

We do not use tracking cookies or third-party analytics that track you across websites.

## Children's Privacy

STL Shelf is not intended for children under 16. We do not knowingly collect information from children under 16.

## International Transfers

Your data may be processed in countries outside your residence. We ensure appropriate safeguards are in place for any international transfers.

## Changes to This Policy

We may update this policy from time to time. We will notify you of significant changes via email or through the service. The consent banner will appear when terms are updated, requiring your re-acceptance.

## Contact Us

For questions about this Privacy Policy or to exercise your data rights, contact us at:
- Email: privacy@stlshelf.com
- Address: CQ Fabrication, Italy$body$,
  NOW(),
  NOW()
);
