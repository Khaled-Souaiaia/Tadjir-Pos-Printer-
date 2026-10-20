/**
 * Generates all official Windows icon assets for TADJIR
 * From the new official TADJIR logo
 * Generates 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 and multi-res .ico
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const sourceImage = path.join(rootDir, 'src/assets/images/tadjir_official_logo_1790812640568.jpg');
const buildResourcesDir = path.join(rootDir, 'build-resources');
const iconsDir = path.join(buildResourcesDir, 'icons');
const publicDir = path.join(rootDir, 'public');
const generatedAssets = [
  path.join(buildResourcesDir, 'tadjir-logo-full.png'),
  path.join(buildResourcesDir, 'tadjir-logo-transparent.png'),
  path.join(buildResourcesDir, 'tadjir-emblem.png'),
  path.join(buildResourcesDir, 'tadjir-emblem-transparent.png'),
  path.join(buildResourcesDir, 'icon-tadjir.ico'),
  path.join(buildResourcesDir, 'icon-tadjir.png'),
  ...[16, 32, 48, 64, 128, 256].map((size) => path.join(iconsDir, `${size}x${size}.png`)),
  path.join(publicDir, 'favicon.ico'),
  path.join(publicDir, 'icon.png'),
  path.join(publicDir, 'logo.png'),
];

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('=== Generating Official TADJIR Windows Icon Assets ===');
console.log('Source asset:', sourceImage);

const imageMagick = spawnSync('magick', ['-version'], { stdio: 'ignore' });
if (imageMagick.error && generatedAssets.every((asset) => fs.existsSync(asset))) {
  console.log('Using existing generated icon assets; ImageMagick is not installed.');
  process.exit(0);
}
if (imageMagick.error) {
  throw new Error('ImageMagick 7 (the "magick" command) is required to generate missing TADJIR icon assets.');
}

function convert(...args) {
  execFileSync('magick', args, { stdio: 'inherit' });
}

// 1. Prepare master high-resolution full logo (cropped precisely to eliminate unused outer margins)
// Full logo bounding box is 562x669 centered at (512, 526). Cropping a 730x730 square (+147+161)
// provides mathematically equal horizontal (84px) and vertical (30px) margins.
const fullLogoMaster = path.join(buildResourcesDir, 'tadjir-logo-full.png');
convert(sourceImage, '-crop', '730x730+147+161', '+repage', '-resize', '1024x1024', fullLogoMaster);

// Create transparent background version of full logo (transparent everywhere including inner loops)
const fullLogoTransparent = path.join(buildResourcesDir, 'tadjir-logo-transparent.png');
convert(fullLogoMaster, '-fuzz', '12%', '-transparent', '#0A0F13', fullLogoTransparent);

// 2. Prepare the clean symbol/emblem (the ribbon T + cash register + chart)
// Symbol bounding box is 467x435 centered at (528, 409). Cropping a 490x490 square (+283+164)
// perfectly centers the symbol with optimal padding for small icon sizes (16, 32, 48, 64)
const emblemCropped = path.join(buildResourcesDir, 'tadjir-emblem.png');
convert(sourceImage, '-crop', '490x490+283+164', '+repage', '-resize', '512x512', emblemCropped);

const emblemTransparent = path.join(buildResourcesDir, 'tadjir-emblem-transparent.png');
convert(emblemCropped, '-fuzz', '12%', '-transparent', '#0A0F13', emblemTransparent);

// 3. Generate individual resolution PNG files:
// 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
console.log('Generating PNG resolutions...');

// Small sizes (16, 32, 48) use the high-contrast emblem symbol for maximum clarity
convert(emblemTransparent, '-filter', 'Mitchell', '-resize', '16x16', path.join(iconsDir, '16x16.png'));
convert(emblemTransparent, '-filter', 'Mitchell', '-resize', '32x32', path.join(iconsDir, '32x32.png'));
convert(emblemTransparent, '-filter', 'Mitchell', '-resize', '48x48', path.join(iconsDir, '48x48.png'));

// Medium size (64) uses the emblem with crisp definition
convert(emblemTransparent, '-filter', 'Mitchell', '-resize', '64x64', path.join(iconsDir, '64x64.png'));

// Large sizes (128, 256) use the complete TADJIR brand logo
convert(fullLogoTransparent, '-filter', 'Lanczos', '-resize', '128x128', path.join(iconsDir, '128x128.png'));
convert(fullLogoTransparent, '-filter', 'Lanczos', '-resize', '256x256', path.join(iconsDir, '256x256.png'));

// Also save 256x256 as build-resources/icon-tadjir.png and public/icon.png
const mainPng = path.join(buildResourcesDir, 'icon-tadjir.png');
fs.copyFileSync(path.join(iconsDir, '256x256.png'), mainPng);
fs.copyFileSync(mainPng, path.join(publicDir, 'icon.png'));

// Save full high-res logo in public/logo.png for in-app UI / splash screens
const publicLogo = path.join(publicDir, 'logo.png');
convert(fullLogoTransparent, '-filter', 'Lanczos', '-resize', '512x512', publicLogo);

// 4. Assemble Windows Multi-Resolution .ICO file
console.log('Assembling multi-resolution Windows .ICO container...');
const tadjirIco = path.join(buildResourcesDir, 'icon-tadjir.ico');

convert(
  path.join(iconsDir, '16x16.png'),
  path.join(iconsDir, '32x32.png'),
  path.join(iconsDir, '48x48.png'),
  path.join(iconsDir, '64x64.png'),
  path.join(iconsDir, '128x128.png'),
  path.join(iconsDir, '256x256.png'),
  tadjirIco
);

// Copy to public/favicon.ico
fs.copyFileSync(tadjirIco, path.join(publicDir, 'favicon.ico'));

console.log('✓ Successfully generated all Windows icon assets:');
console.log('  - build-resources/icon-tadjir.ico  (Windows multi-res ICO: 16, 32, 48, 64, 128, 256)');
console.log('  - build-resources/icon-tadjir.png  (256x256 PNG)');
console.log('  - build-resources/icons/*.png      (16x16, 32x32, 48x48, 64x64, 128x128, 256x256)');
console.log('  - public/favicon.ico');
console.log('  - public/icon.png');
console.log('  - public/logo.png');
