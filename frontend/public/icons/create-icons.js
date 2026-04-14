/**
 * Genera íconos PNG para PWA sin dependencias externas.
 * Solo requiere Node.js (ya instalado).
 * Uso: node create-icons.js
 *
 * Crea íconos con fondo azul MRB (#2e3c98) con la letra "M" en blanco.
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const DIR = path.dirname(__filename);

// MRB Blue: #2e3c98
const BG_R = 46, BG_G = 60, BG_B = 152;
// White text
const FG_R = 255, FG_G = 255, FG_B = 255;

// ── CRC32 ──────────────────────────────────────────────────────────────
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++)
      crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

// ── Dibuja la letra "M" centrada (pixel art 5×7 escalado) ────────────
//   #.#.#
//   ##.##
//   #.#.#
//   #...#
//   #...#
//   #...#
//   #...#
const M_PATTERN = [
  [1,0,0,0,1],
  [1,1,0,1,1],
  [1,0,1,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
];

function createPNG(size) {
  const scale  = Math.floor(size * 0.45 / 7);  // escala de la letra
  const lw     = 5 * scale;                      // ancho letra
  const lh     = 7 * scale;                      // alto letra
  const offX   = Math.floor((size - lw) / 2);
  const offY   = Math.floor((size - lh) / 2);

  // Buffer raw: por cada fila → 1 byte filtro + size*3 bytes RGB
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize, 0);

  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      // Determine color
      let r = BG_R, g = BG_G, b = BG_B;

      const px = x - offX, py = y - offY;
      if (px >= 0 && px < lw && py >= 0 && py < lh) {
        const col = Math.floor(px / scale);
        const row = Math.floor(py / scale);
        if (M_PATTERN[row] && M_PATTERN[row][col]) {
          r = FG_R; g = FG_G; b = FG_B;
        }
      }

      const base = y * rowSize + 1 + x * 3;
      raw[base] = r; raw[base+1] = g; raw[base+2] = b;
    }
  }

  const idat = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

[180, 192, 512].forEach(s => {
  const file = path.join(DIR, `icon-${s}.png`);
  fs.writeFileSync(file, createPNG(s));
  console.log(`  ✓ icon-${s}.png`);
});

console.log('\n✅ Íconos generados (fondo azul MRB #2e3c98)');
console.log('   Para mejores íconos con logo, reemplaza los PNG manualmente.');
