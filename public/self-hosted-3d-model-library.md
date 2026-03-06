# Self-Host STL Shelf

Canonical: https://stl-shelf.com/self-hosted-3d-model-library

Deploy STL Shelf on your own infrastructure with PostgreSQL, S3-compatible storage, Resend, Cloudflare Turnstile, OpenPanel, and Polar.
This page documents the prerequisites for a supported self-hosted deployment.
Use the repository as the source of truth for the full setup.

## Prerequisites

- PostgreSQL
- S3-compatible storage (MinIO, R2, S3)
- Resend
- Cloudflare Turnstile
- OpenPanel
- Polar

## Deployment flow

1. Clone the repository.
2. Provision the required services.
3. Set the environment variables.
4. Run the app.

## What each service does

- PostgreSQL -> users, organizations, metadata, tags, version history
- S3-compatible storage -> file uploads and downloads
- Resend -> email verification, magic links, password reset, invitation emails
- Cloudflare Turnstile -> CAPTCHA on signup and auth flows
- OpenPanel -> product analytics and event tracking
- Polar -> billing, subscriptions, checkout, customer portal

## Need the full setup?

Use the repository as the source of truth for the complete setup.

- https://github.com/CQ-Fabrication/stl-shelf

## Related links

- [FAQs](https://stl-shelf.com/faqs.md)
- [Organize STL files](https://stl-shelf.com/organize-stl-files.md)
- [Private 3D model library](https://stl-shelf.com/private-3d-model-library.md)
- [Pricing](https://stl-shelf.com/pricing.md)
- [About](https://stl-shelf.com/about.md)
