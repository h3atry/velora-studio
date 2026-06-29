/**
 * Gera icon.png (512), icon-256.png e icon.ico quadrados para Windows.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = path.join(__dirname, '../public/brand');
const svgPath = path.join(brandDir, 'icon.svg');

const sizes = [16, 32, 48, 64, 128, 256, 512];

async function main() {
  const svg = fs.readFileSync(svgPath);

  for (const size of [256, 512, 1024]) {
    const out = path.join(
      brandDir,
      size === 512 ? 'icon.png' : size === 256 ? 'icon-256.png' : 'icon-1024.png'
    );
    await sharp(svg, { density: 300 })
      .resize(size, size, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`✓ ${out} (${size}×${size})`);
  }

  const pngBuffers = await Promise.all(
    sizes.map(async (size) => {
      return sharp(svg, { density: 300 })
        .resize(size, size, { fit: 'cover' })
        .png()
        .toBuffer();
    })
  );

  const ico = await pngToIco(pngBuffers);
  fs.writeFileSync(path.join(brandDir, 'icon.ico'), ico);
  console.log(`✓ icon.ico (${sizes.join(', ')}px)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
