/** @jsxImportSource react */
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type React from "react";

/**
 * STL Shelf Design System Colors
 * Converted from OKLCH values in packages/ui/src/styles/globals.css
 *
 * --brand: oklch(0.7043 0.1647 48.73) → #D97706 (orange)
 * --foreground: oklch(0.145 0 0) → #171717
 * --muted-foreground: oklch(0.556 0 0) → #737373
 * --border: oklch(0.922 0 0) → #E5E5E5
 * --background: oklch(1 0 0) → #FFFFFF
 * --secondary: oklch(0.97 0 0) → #F5F5F5
 */
const colors = {
  brand: "#D97706",
  foreground: "#171717",
  muted: "#737373",
  border: "#E5E5E5",
  background: "#FFFFFF",
  secondary: "#F5F5F5",
  white: "#FFFFFF",
};

const main = {
  backgroundColor: colors.secondary,
  fontFamily:
    "'Inter', 'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const container = {
  backgroundColor: colors.background,
  margin: "0 auto",
  padding: "0",
  maxWidth: "600px",
  borderRadius: "10px",
  overflow: "hidden" as const,
  border: `1px solid ${colors.border}`,
};

const header = {
  padding: "32px 40px",
  borderBottom: `1px solid ${colors.border}`,
};

const content = {
  padding: "40px",
};

const footer = {
  padding: "24px 40px",
  backgroundColor: colors.secondary,
  borderTop: `1px solid ${colors.border}`,
  textAlign: "center" as const,
};

const footerText = {
  color: colors.muted,
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0",
};

const footerLink = {
  color: colors.muted,
  fontSize: "12px",
  textDecoration: "underline",
};

type EmailLayoutProps = {
  children: React.ReactNode;
  preview?: string;
  logoUrl?: string;
};

const logoText = {
  color: colors.brand,
  fontSize: "24px",
  fontWeight: "700" as const,
  margin: "0",
  textDecoration: "none",
};

export function EmailLayout({
  children,
  preview,
  logoUrl,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Body style={main}>
        <Container style={{ padding: "40px 20px" }}>
          <Container style={container}>
            {/* Header with Logo */}
            <Section style={header}>
              {logoUrl ? (
                <Img alt="STL Shelf" height="32" src={logoUrl} width="89" />
              ) : (
                <Text style={logoText}>STL Shelf</Text>
              )}
            </Section>

            {/* Content */}
            <Section style={content}>{children}</Section>

            {/* Footer */}
            <Section style={footer}>
              <Text style={footerText}>
                STL Shelf - Your Personal 3D Model Library
              </Text>
              <Hr
                style={{
                  borderColor: colors.border,
                  margin: "16px 0",
                }}
              />
              <Text style={footerText}>
                <Link href="https://stl-shelf.com/help" style={footerLink}>
                  Help Center
                </Link>
                {" • "}
                <Link href="https://stl-shelf.com/privacy" style={footerLink}>
                  Privacy Policy
                </Link>
              </Text>
            </Section>
          </Container>
        </Container>
      </Body>
    </Html>
  );
}
