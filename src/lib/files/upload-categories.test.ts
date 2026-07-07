import { describe, expect, it } from "vitest";
import { getUploadFileCategory, UPLOAD_ACCEPTED_EXTENSIONS } from "./upload-categories";

describe("getUploadFileCategory", () => {
  it("categorizes model files", () => {
    expect(getUploadFileCategory("benchy.stl")).toBe("model");
    expect(getUploadFileCategory("part.OBJ")).toBe("model");
    expect(getUploadFileCategory("scan.ply")).toBe("model");
  });

  it("categorizes 3mf as slicer project", () => {
    expect(getUploadFileCategory("print.3mf")).toBe("slicer");
  });

  it("categorizes images", () => {
    expect(getUploadFileCategory("photo.jpg")).toBe("image");
    expect(getUploadFileCategory("photo.webp")).toBe("image");
  });

  it("returns null for extensions the modals do not accept", () => {
    expect(getUploadFileCategory("anim.gif")).toBe(null);
    expect(getUploadFileCategory("part.step")).toBe(null);
    expect(getUploadFileCategory("print.gcode")).toBe(null);
    expect(getUploadFileCategory("noextension")).toBe(null);
  });
});

describe("UPLOAD_ACCEPTED_EXTENSIONS", () => {
  it("contains exactly the extensions of the upload categories, with dot", () => {
    expect([...UPLOAD_ACCEPTED_EXTENSIONS].sort()).toEqual(
      [".stl", ".obj", ".ply", ".3mf", ".jpg", ".jpeg", ".png", ".webp"].sort(),
    );
  });
});
