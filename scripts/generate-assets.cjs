/**
 * Generate high-resolution PNG and ICO icons for Windows installers
 * TADJIR and TADJIR License Manager
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const buildResourcesDir = path.resolve(__dirname, '../build-resources');
if (!fs.existsSync(buildResourcesDir)) {
  fs.mkdirSync(buildResourcesDir, { recursive: true });
}

// Simple PNG encoder using Node.js built-in zlib
function createPng(width, height, getPixel) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    const crcVal = zlib.crc32(Buffer.concat([typeBuf, data]));
    crc.writeUInt32BE(crcVal >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // 8-bit
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Wrap PNG inside ICO container
function pngToIco(pngBuffer, width, height) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);       // Reserved
  icoHeader.writeUInt16LE(1, 2);       // 1 = Icon
  icoHeader.writeUInt16LE(1, 4);       // 1 Image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(width === 256 ? 0 : width, 0);
  entry.writeUInt8(height === 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2);              // Colors in palette
  entry.writeUInt8(0, 3);              // Reserved
  entry.writeUInt16LE(1, 4);           // Color planes
  entry.writeUInt16LE(32, 6);          // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  entry.writeUInt32LE(22, 12);         // Offset of image data (6 header + 16 entry = 22)

  return Buffer.concat([icoHeader, entry, pngBuffer]);
}

// 1. TADJIR Icon (Emerald/Cobalt modern store icon with rounded corners)
function tadjirPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.42;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Rounded squircle background
  const cornerR = w * 0.22;
  const inBox = Math.abs(dx) <= w * 0.44 && Math.abs(dy) <= h * 0.44;
  const qx = Math.max(0, Math.abs(dx) - (w * 0.44 - cornerR));
  const qy = Math.max(0, Math.abs(dy) - (h * 0.44 - cornerR));
  const outsideCorner = Math.sqrt(qx * qx + qy * qy);

  if (outsideCorner > cornerR) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Gradient background: from vibrant blue (top-left) to deep emerald (bottom-right)
  const grad = (x + y) / (w + h);
  const rBg = Math.round(37 * (1 - grad) + 5 * grad);
  const gBg = Math.round(99 * (1 - grad) + 150 * grad);
  const bBg = Math.round(235 * (1 - grad) + 105 * grad);

  // Draw central Store Shopping Bag / T mark
  // Bag body: cx - 45 to cx + 45, cy - 10 to cy + 55
  const bagLeft = cx - w * 0.20;
  const bagRight = cx + w * 0.20;
  const bagTop = cy - h * 0.05;
  const bagBottom = cy + h * 0.25;

  const inBag = x >= bagLeft && x <= bagRight && y >= bagTop && y <= bagBottom;
  
  // Bag handle: semi circle above bagTop
  const handleRadius = w * 0.12;
  const handleDy = y - bagTop;
  const handleDx = x - cx;
  const handleDist = Math.sqrt(handleDx * handleDx + handleDy * handleDy);
  const inHandle = y <= bagTop && handleDist <= handleRadius && handleDist >= (handleRadius - w * 0.04);

  // Letter "T" in center of bag
  const inTTop = x >= (cx - w * 0.10) && x <= (cx + w * 0.10) && y >= (bagTop + h * 0.06) && y <= (bagTop + h * 0.11);
  const inTStem = x >= (cx - w * 0.03) && x <= (cx + w * 0.03) && y >= (bagTop + h * 0.11) && y <= (bagBottom - h * 0.06);

  if (inTTop || inTStem) {
    return [37, 99, 235, 255]; // Blue "T" on white bag
  }
  if (inBag || inHandle) {
    return [255, 255, 255, 255]; // White bag
  }

  return [rBg, gBg, bBg, 255];
}

// 2. TADJIR License Manager Icon (Slate dark + Electric Gold Key / Shield)
function licenseManagerPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;

  // Squircle background
  const cornerR = w * 0.22;
  const qx = Math.max(0, Math.abs(dx) - (w * 0.44 - cornerR));
  const qy = Math.max(0, Math.abs(dy) - (h * 0.44 - cornerR));
  const outsideCorner = Math.sqrt(qx * qx + qy * qy);

  if (outsideCorner > cornerR) {
    return [0, 0, 0, 0];
  }

  // Dark cyber background with border
  const grad = (x + y) / (w + h);
  const rBg = Math.round(15 * (1 - grad) + 30 * grad);
  const gBg = Math.round(23 * (1 - grad) + 41 * grad);
  const bBg = Math.round(42 * (1 - grad) + 67 * grad);

  // Shield & Key motif
  // Key ring at top right, stem pointing down-left
  const keyCx = cx + w * 0.08;
  const keyCy = cy - h * 0.08;
  const keyDist = Math.sqrt((x - keyCx) * (x - keyCx) + (y - keyCy) * (y - keyCy));
  const keyRingR = w * 0.13;
  const inKeyRing = keyDist <= keyRingR && keyDist >= (keyRingR - w * 0.045);

  // Key shaft diagonal
  const diagDist = Math.abs((x - cx) + (y - cy));
  const inShaft = diagDist <= (w * 0.035) && x >= (cx - w * 0.22) && x <= keyCx && y >= keyCy && y <= (cy + h * 0.22);

  // Key teeth
  const inTooth1 = x >= (cx - w * 0.20) && x <= (cx - w * 0.13) && y >= (cy + h * 0.14) && y <= (cy + h * 0.22);
  const inTooth2 = x >= (cx - w * 0.11) && x <= (cx - w * 0.04) && y >= (cy + h * 0.07) && y <= (cy + h * 0.15);

  if (inKeyRing || inShaft || inTooth1 || inTooth2) {
    return [245, 158, 11, 255]; // Amber Gold
  }

  return [rBg, gBg, bBg, 255];
}

console.log('Generating high-resolution icon assets...');

// Generate TADJIR official logo icons
const { execSync } = require('child_process');
execSync(`node "${path.join(__dirname, 'build-tadjir-icons.cjs')}"`, { stdio: 'inherit' });

// Generate License Manager icons
const lmPng = createPng(256, 256, licenseManagerPixel);
const lmIco = pngToIco(lmPng, 256, 256);
fs.writeFileSync(path.join(buildResourcesDir, 'icon-license-manager.png'), lmPng);
fs.writeFileSync(path.join(buildResourcesDir, 'icon-license-manager.ico'), lmIco);

console.log('✓ Icon assets successfully generated in build-resources/ and public/');
