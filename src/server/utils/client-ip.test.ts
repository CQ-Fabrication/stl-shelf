import { describe, expect, it } from "vitest";
import { extractClientIp } from "./client-ip";

describe("extractClientIp", () => {
  it("prefers CF-Connecting-IP over X-Forwarded-For", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": "172.69.10.20",
      "x-real-ip": "172.70.30.40",
    });

    expect(extractClientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to the first X-Forwarded-For hop", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.9, 172.69.10.20, 10.0.0.1",
    });

    expect(extractClientIp(headers)).toBe("198.51.100.9");
  });

  it("trims whitespace around forwarded hops", () => {
    const headers = new Headers({
      "x-forwarded-for": "  198.51.100.9 , 10.0.0.1",
    });

    expect(extractClientIp(headers)).toBe("198.51.100.9");
  });

  it("falls back to X-Real-IP when other headers are missing", () => {
    const headers = new Headers({ "x-real-ip": "192.0.2.33" });

    expect(extractClientIp(headers)).toBe("192.0.2.33");
  });

  it("ignores empty or whitespace-only header values", () => {
    const headers = new Headers({
      "cf-connecting-ip": "   ",
      "x-forwarded-for": "",
      "x-real-ip": "192.0.2.33",
    });

    expect(extractClientIp(headers)).toBe("192.0.2.33");
  });

  it("returns null when no IP headers are present", () => {
    expect(extractClientIp(new Headers())).toBeNull();
  });
});
