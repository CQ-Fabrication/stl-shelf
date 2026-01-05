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
import { colors, fontFamily } from "../styles";

const main = {
  backgroundColor: colors.secondary,
  fontFamily,
};

const container = {
  backgroundColor: colors.background,
  margin: "0 auto",
  padding: "0",
  maxWidth: "640px",
  borderRadius: "12px",
  overflow: "hidden" as const,
  border: `1px solid ${colors.border}`,
};

const header = {
  padding: "32px 40px",
  borderBottom: `1px solid ${colors.border}`,
  textAlign: "center" as const,
};

const content = {
  padding: "40px",
};

const footer = {
  padding: "24px 40px",
  backgroundColor: colors.background,
  borderTop: `1px solid ${colors.border}`,
  textAlign: "center" as const,
};

const footerText = {
  color: colors.muted,
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
};

const footerLink = {
  color: colors.muted,
  fontSize: "13px",
  textDecoration: "underline",
};

const logoText = {
  color: colors.brand,
  fontSize: "24px",
  fontWeight: "700" as const,
  margin: "0",
  textDecoration: "none",
  textAlign: "center" as const,
};

type EmailLayoutProps = {
  children: React.ReactNode;
  preview?: string;
  logoUrl?: string;
};

export function EmailLayout({ children, preview, logoUrl }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Body style={main}>
        <Container style={{ padding: "40px 20px" }}>
          <Container style={container}>
            {/* Header with logo */}
            <Section style={header}>
              {logoUrl ? (
                <Img alt="STL Shelf" height="32" src={logoUrl} style={{ margin: "0 auto" }} />
              ) : (
                <Text style={logoText}>STL Shelf</Text>
              )}
            </Section>

            {/* Main content area */}
            <Section style={content}>{children}</Section>

            {/* Footer */}
            <Section style={footer}>
              <Text style={footerText}>STL Shelf - 3D Model Library for Makers</Text>
              <Hr
                style={{
                  borderColor: colors.border,
                  margin: "16px 0",
                }}
              />
              <Text style={footerText}>
                <Link href="https://stl-shelf.com" style={footerLink}>
                  stl-shelf.com
                </Link>
                {" · "}
                <Link href="https://stl-shelf.com/privacy" style={footerLink}>
                  Privacy
                </Link>
                {" · "}
                <Link href="https://stl-shelf.com/terms" style={footerLink}>
                  Terms
                </Link>
              </Text>
            </Section>
          </Container>
        </Container>
      </Body>
    </Html>
  );
}
