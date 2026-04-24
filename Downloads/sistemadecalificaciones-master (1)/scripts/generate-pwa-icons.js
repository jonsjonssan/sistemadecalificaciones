const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "public");

async function generateIcons() {
  const svgBuffer = fs.readFileSync(path.join(publicDir, "icon.svg"));

  // Generar icon-192x192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, "icon-192x192.png"));
  console.log("✓ Generated icon-192x192.png");

  // Generar icon-512x512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-512x512.png"));
  console.log("✓ Generated icon-512x512.png");

  // Generar screenshots placeholder (simples gradientes)
  // Wide screenshot
  await sharp({
    create: {
      width: 1280,
      height: 720,
      channels: 4,
      background: { r: 13, g: 148, b: 136, alpha: 1 },
    },
  })
    .png()
    .toFile(path.join(publicDir, "screenshot-wide.png"));
  console.log("✓ Generated screenshot-wide.png");

  // Narrow screenshot
  await sharp({
    create: {
      width: 540,
      height: 720,
      channels: 4,
      background: { r: 13, g: 148, b: 136, alpha: 1 },
    },
  })
    .png()
    .toFile(path.join(publicDir, "screenshot-narrow.png"));
  console.log("✓ Generated screenshot-narrow.png");

  console.log("\n✅ All PWA assets generated successfully!");
}

generateIcons().catch(console.error);
