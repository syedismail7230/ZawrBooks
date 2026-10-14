const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcLogo = path.join(projectRoot, 'public', 'favicon.png');

async function generateIcons() {
  console.log('Generating crisp Zawr Books app icons from official logo:', srcLogo);

  // Android mipmap densities:
  // mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192
  const androidDensities = [
    { folder: 'mipmap-mdpi', size: 48 },
    { folder: 'mipmap-hdpi', size: 72 },
    { folder: 'mipmap-xhdpi', size: 96 },
    { folder: 'mipmap-xxhdpi', size: 144 },
    { folder: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { folder, size } of androidDensities) {
    const dirPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', folder);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const innerSize = Math.round(size * 0.72);
    const pad = Math.round((size - innerSize) / 2);
    const rx = Math.round(size * 0.22);

    // Inner logo scaled
    const innerLogo = await sharp(srcLogo)
      .resize(innerSize, innerSize, { fit: 'contain' })
      .toBuffer();

    // 1. Standard Squircle Launcher Icon
    const squircleSvg = `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${rx}" fill="#FFFFFF"/></svg>`;
    const squircleBuffer = await sharp(Buffer.from(squircleSvg))
      .composite([{ input: innerLogo, left: pad, top: pad }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), squircleBuffer);

    // 2. Round Launcher Icon
    const roundSvg = `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#FFFFFF"/></svg>`;
    const roundBuffer = await sharp(Buffer.from(roundSvg))
      .composite([{ input: innerLogo, left: pad, top: pad }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), roundBuffer);

    console.log(`✓ Android ${folder}: ${size}x${size} ic_launcher.png & ic_launcher_round.png`);
  }

  // Apple Touch Icon (180x180, white background with safe margin per Apple HIG)
  const appleSize = 180;
  const appleInner = Math.round(appleSize * 0.72);
  const applePad = Math.round((appleSize - appleInner) / 2);
  const appleSvg = `<svg width="${appleSize}" height="${appleSize}"><rect width="${appleSize}" height="${appleSize}" fill="#FFFFFF"/></svg>`;
  const appleInnerLogo = await sharp(srcLogo)
    .resize(appleInner, appleInner, { fit: 'contain' })
    .toBuffer();
  const appleIcon = await sharp(Buffer.from(appleSvg))
    .composite([{ input: appleInnerLogo, left: applePad, top: applePad }])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(projectRoot, 'public', 'apple-touch-icon.png'), appleIcon);
  fs.writeFileSync(path.join(projectRoot, 'src', 'app', 'apple-icon.png'), appleIcon);
  console.log('✓ Generated apple-touch-icon.png (180x180)');

  // PWA Manifest Icons (192 and 512)
  for (const pwaSize of [192, 512]) {
    const pwaInner = Math.round(pwaSize * 0.72);
    const pwaPad = Math.round((pwaSize - pwaInner) / 2);
    const pwaSvg = `<svg width="${pwaSize}" height="${pwaSize}"><rect width="${pwaSize}" height="${pwaSize}" rx="${Math.round(pwaSize * 0.22)}" fill="#FFFFFF"/></svg>`;
    const pwaInnerLogo = await sharp(srcLogo)
      .resize(pwaInner, pwaInner, { fit: 'contain' })
      .toBuffer();
    const pwaIcon = await sharp(Buffer.from(pwaSvg))
      .composite([{ input: pwaInnerLogo, left: pwaPad, top: pwaPad }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(projectRoot, 'public', `icon-${pwaSize}.png`), pwaIcon);
    if (pwaSize === 512) {
      fs.writeFileSync(path.join(projectRoot, 'src', 'app', 'icon.png'), pwaIcon);
    }
    console.log(`✓ Generated icon-${pwaSize}.png`);
  }

  console.log('All app icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
