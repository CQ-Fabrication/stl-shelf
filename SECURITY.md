# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in STL Shelf, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email us at: **security@cqfabrication.com**

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 7 days
- **Resolution target**: Within 30 days (depending on severity)

## Supported Versions

| Version  | Supported |
| -------- | --------- |
| Latest   | Yes       |
| < Latest | No        |

We only provide security updates for the latest release. Please keep your installation up to date.

## Security Best Practices

When self-hosting STL Shelf:

- Keep your instance updated to the latest version
- Use strong, unique values for `BETTER_AUTH_SECRET`
- Run behind a reverse proxy with HTTPS
- Restrict database access to the application only
- Regularly backup your data
- Monitor access logs for suspicious activity

## Non-Security Issues

For general support or bug reports, please use:

- **Support**: support@stl-shelf.com
- **GitHub Issues**: [github.com/CQ-Fabrication/stl-shelf/issues](https://github.com/CQ-Fabrication/stl-shelf/issues)
