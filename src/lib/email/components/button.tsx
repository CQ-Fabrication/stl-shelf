/** @jsxImportSource react */
import { Link } from "@react-email/components";
import type React from "react";
import { colors } from "../styles";

const buttonStyle = {
  backgroundColor: colors.brand,
  color: colors.white,
  padding: "14px 32px",
  borderRadius: "8px",
  fontWeight: "600" as const,
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
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
