// =============================================
// HYUK - GENERADOR DE ICONOS PWA (PNG puro, sin dependencias)
// Uso: node scripts/generate-icons.js
// =============================================

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ---- Utilidades PNG ----

const CRC_TABLE = (() => {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Filtros por fila (filtro 0 = None)
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Dibujo del icono ----

function hexToRgba(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    255,
  ];
}

function drawRoundedRect(rgba, size, margin, radius, color) {
  const min = margin;
  const max = size - margin;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x < min || x >= max || y < min || y >= max) continue;

      let inside = true;
      if (x < min + radius && y < min + radius) {
        const dx = min + radius - x;
        const dy = min + radius - y;
        inside = dx * dx + dy * dy <= radius * radius;
      } else if (x >= max - radius && y < min + radius) {
        const dx = x - (max - radius);
        const dy = min + radius - y;
        inside = dx * dx + dy * dy <= radius * radius;
      } else if (x < min + radius && y >= max - radius) {
        const dx = min + radius - x;
        const dy = y - (max - radius);
        inside = dx * dx + dy * dy <= radius * radius;
      } else if (x >= max - radius && y >= max - radius) {
        const dx = x - (max - radius);
        const dy = y - (max - radius);
        inside = dx * dx + dy * dy <= radius * radius;
      }

      if (inside) {
        const idx = (y * size + x) * 4;
        rgba[idx] = color[0];
        rgba[idx + 1] = color[1];
        rgba[idx + 2] = color[2];
        rgba[idx + 3] = color[3];
      }
    }
  }
}

function drawGradient(rgba, size, topColor, bottomColor) {
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const idx = y * size * 4;
    for (let x = 0; x < size * 4; x += 4) {
      rgba[idx + x] = Math.round(topColor[0] + (bottomColor[0] - topColor[0]) * t);
      rgba[idx + x + 1] = Math.round(topColor[1] + (bottomColor[1] - topColor[1]) * t);
      rgba[idx + x + 2] = Math.round(topColor[2] + (bottomColor[2] - topColor[2]) * t);
      rgba[idx + x + 3] = 255;
    }
  }
}

function drawCircle(rgba, size, cx, cy, radius, color) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        const idx = (y * size + x) * 4;
        rgba[idx] = color[0];
        rgba[idx + 1] = color[1];
        rgba[idx + 2] = color[2];
        rgba[idx + 3] = color[3];
      }
    }
  }
}

function generate(size) {
  const rgba = Buffer.alloc(size * size * 4);
  // Fondo gradiente emerald → teal
  drawGradient(rgba, size, [16, 185, 129], [13, 148, 136]);
  // Ronda las esquinas
  const margin = Math.round(size * 0.05);
  const radius = Math.round(size * 0.22);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inRounded = (() => {
        if (x >= margin && x < size - margin && y >= margin && y < size - margin) return true;
        const corners = [
          [margin, margin],
          [size - 1 - margin, margin],
          [margin, size - 1 - margin],
          [size - 1 - margin, size - 1 - margin],
        ];
        let dist = Infinity;
        for (const [cx, cy] of corners) {
          const dx = x - cx;
          const dy = y - cy;
          dist = Math.min(dist, Math.sqrt(dx * dx + dy * dy));
        }
        return dist <= radius;
      })();
      if (!inRounded) {
        const idx = (y * size + x) * 4;
        rgba[idx + 3] = 0; // transparencia fuera del rectángulo redondeado
      }
    }
  }
  // Símbolo central: círculo blanco con borde
  drawCircle(rgba, size, size / 2, size / 2, size * 0.17, [255, 255, 255]);
  // Anillo interior emerald (detalle)
  drawCircle(rgba, size, size / 2, size / 2, size * 0.115, [16, 185, 129]);
  return rgba;
}

// ---- Generación ----

const outDir = path.join(__dirname, '..', 'public');
const sizes = [192, 512];

for (const size of sizes) {
  const rgba = generate(size);
  const png = encodePNG(size, size, rgba);
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`✅ Generated ${file} (${png.length} bytes)`);
}

console.log('\n🎉 Iconos PWA generados correctamente.');