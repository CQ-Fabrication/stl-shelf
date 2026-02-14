import { describe, expect, it } from "vitest";
import {
  createArchiveEntryPath,
  createContentDisposition,
  sanitizeFilename,
} from "./filename-security";

describe("filename-security", () => {
  it("sanitizes traversal and control characters from filenames", () => {
    expect(sanitizeFilename("../..\\evil-file.stl")).toBe("evil-file.stl");
    expect(sanitizeFilename("..\n\r")).toBe("file");
    expect(sanitizeFilename("  safe-name.3mf  ")).toBe("safe-name.3mf");
  });

  it("builds safe content-disposition headers", () => {
    const header = createContentDisposition(
      "attachment",
      'evil"\r\nSet-Cookie: session=steal.3mf',
      "download.3mf",
    );

    expect(header).toContain("attachment;");
    expect(header).toContain("filename=");
    expect(header).toContain("filename*=");
    expect(header).not.toContain("\r");
    expect(header).not.toContain("\n");
  });

  it("builds archive paths from sanitized components", () => {
    const entryPath = createArchiveEntryPath({
      folder: "../Model-1",
      subfolder: "profiles",
      filename: "..\\..\\dangerous.gcode",
      fallbackFilename: "profile.gcode",
    });

    expect(entryPath).toBe("Model-1/profiles/dangerous.gcode");
  });
});
