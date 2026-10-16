import { chromium } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicDirectory = resolve(root, "apps/web/public");
const svg = await readFile(resolve(publicDirectory, "favicon.svg"), "utf8");
const source = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const browser = await chromium.launch();

async function renderIcon(size) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  try {
    await page.setContent(
      `<html><head><style>html,body{margin:0;width:100%;height:100%}img{display:block;width:${size}px;height:${size}px}</style></head><body><img src="${source}" alt=""></body></html>`,
    );
    const image = page.locator("img");
    await image.evaluate((element) => element.decode());
    return await image.screenshot({ omitBackground: true });
  } finally {
    await page.close();
  }
}

try {
  for (const [filename, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
  ]) {
    await writeFile(resolve(publicDirectory, filename), await renderIcon(size));
  }

  const sizes = [16, 32, 48, 256];
  const images = await Promise.all(sizes.map(renderIcon));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(sizes[index] === 256 ? 0 : sizes[index], entry);
    header.writeUInt8(sizes[index] === 256 ? 0 : sizes[index], entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  await writeFile(
    resolve(publicDirectory, "favicon.ico"),
    Buffer.concat([header, ...images]),
  );
} finally {
  await browser.close();
}
