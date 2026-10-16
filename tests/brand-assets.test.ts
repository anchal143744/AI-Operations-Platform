import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { describe, expect, it } from "vitest";

const publicDirectory = resolve(
  fileURLToPath(new URL("../apps/web/public/", import.meta.url)),
);

describe("product brand assets", () => {
  it("uses the same blue and teal mark for the browser favicon", () => {
    const svg = readFileSync(resolve(publicDirectory, "favicon.svg"), "utf8");
    expect(svg).toContain('fill="#356df3"');
    expect(svg).toContain('fill="#4fdbc1"');
  });

  it("provides an identifiable app manifest with real PNG icons", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(publicDirectory, "manifest.webmanifest"), "utf8"),
    ) as {
      name: string;
      icons: { src: string; sizes: string }[];
    };
    expect(manifest.name).toBe("AI Operations Platform");
    for (const icon of manifest.icons) {
      const png = readFileSync(resolve(publicDirectory, icon.src.slice(1)));
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      const [expectedSize] = icon.sizes.split("x").map(Number);
      expect(png.readUInt32BE(16)).toBe(expectedSize);
      expect(png.readUInt32BE(20)).toBe(expectedSize);
    }
  });

  it("includes a multi-size Windows shortcut icon", () => {
    const icon = readFileSync(resolve(publicDirectory, "favicon.ico"));
    expect(icon.readUInt16LE(0)).toBe(0);
    expect(icon.readUInt16LE(2)).toBe(1);
    expect(icon.readUInt16LE(4)).toBe(4);
    expect(
      readFileSync(resolve(publicDirectory, "apple-touch-icon.png")).length,
    ).toBeGreaterThan(0);
  });
});
