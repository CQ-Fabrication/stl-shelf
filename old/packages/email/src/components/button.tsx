/** @jsxImportSource react */
import { Link } from "@react-email/components";
import type React from "react";

/**
 * STL Shelf Design System Colors
 * --brand: oklch(0.7043 0.1647 48.73) → #D97706 (orange)
 */
const colors = {
  brand: "#D97706",
  white: "#FFFFFF",
};

const buttonStyle = {
  backgroundColor: colors.brand,
  color: colors.white,
  padding: "14px 28px",
  borderRadius: "10px",
  fontWeight: "600" as const,
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
};

type ButtonProps = {
  href: string;
  children: React.ReactNode;
};

export function Button({ href, children }: ButtonProps) {
  return (
    <Link href={href} style={buttonStyle}>
      {children}
    </Link>
  );
}
