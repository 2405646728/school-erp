/**
 * 生成品牌资源（全部纯代码绘制，无需图形库）：
 *   build/icon.ico            应用与快捷方式图标（7 种尺寸）
 *   build/wizard-side.bmp     安装向导左侧品牌图（164×314，NSIS 欢迎/完成页）
 *   build/wizard-header.bmp   安装向导页眉图（150×57）
 *   node scripts/make-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------- 图形绘制（单位化坐标，便于任意尺寸复用） ---------------- */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** 圆角矩形的有符号距离（<0 表示在内部） */
function roundedRectSdf(u, v, half, radius) {
  const dx = Math.abs(u - 0.5) - (half - radius);
  const dy = Math.abs(v - 0.5) - (half - radius);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(dx, dy), 0) - radius;
}

/** 菱形（学士帽顶） */
function diamondSdf(u, v, cx, cy, rx, ry) {
  return Math.abs(u - cx) / rx + Math.abs(v - cy) / ry - 1;
}

/** 在给定单位化坐标处采样颜色，返回 [r,g,b,a]，a 为 0..1 */
function sample(u, v) {
  // 圆角方块底
  const sdf = roundedRectSdf(u, v, 0.47, 0.16);
  const alpha = clamp01(0.5 - sdf * 120); // 抗锯齿过渡
  if (alpha <= 0) return [0, 0, 0, 0];

  // 蓝色 → 青色渐变
  const t = clamp01((u + v) / 2 * 1.15 - 0.05);
  let r = lerp(0x1f, 0x06, t);
  let g = lerp(0x5f, 0xb6, t);
  let b = lerp(0xe0, 0xd4, t);

  // 学士帽：菱形帽顶 + 帽身 + 流苏
  const capTop = diamondSdf(u, v, 0.5, 0.42, 0.30, 0.175);
  const capBody =
    Math.abs(u - 0.5) <= 0.20 && v >= 0.54 && v <= 0.635 ? -1 : 1;
  const tasselLine = Math.abs(u - 0.705) <= 0.016 && v >= 0.42 && v <= 0.665 ? -1 : 1;
  const tasselBall = Math.hypot(u - 0.705, v - 0.69) - 0.045;

  const cap = Math.min(capTop, capBody, tasselLine, tasselBall);
  const capAlpha = clamp01(0.5 - cap * 120);

  if (capAlpha > 0) {
    r = lerp(r, 255, capAlpha);
    g = lerp(g, 255, capAlpha);
    b = lerp(b, 255, capAlpha);
  }

  return [Math.round(r), Math.round(g), Math.round(b), Math.round(alpha * 255)];
}

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const sub = size <= 32 ? 4 : 3; // 小尺寸多采样几次，边缘更干净
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < sub; sy += 1) {
        for (let sx = 0; sx < sub; sx += 1) {
          const u = (x + (sx + 0.5) / sub) / size;
          const v = (y + (sy + 0.5) / sub) / size;
          const [pr, pg, pb, pa] = sample(u, v);
          const w = pa / 255;
          r += pr * w;
          g += pg * w;
          b += pb * w;
          a += pa;
        }
      }
      const count = sub * sub;
      const alphaAvg = a / count;
      const weight = alphaAvg / 255 || 1;
      const offset = (y * size + x) * 4;
      rgba[offset] = Math.round(r / count / weight);
      rgba[offset + 1] = Math.round(g / count / weight);
      rgba[offset + 2] = Math.round(b / count / weight);
      rgba[offset + 3] = Math.round(alphaAvg);
    }
  }
  return encodePng(size, size, rgba);
}

const SIZES = [16, 24, 32, 48, 64, 128, 256];

function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0; // palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((item) => item.data)]);
}

const images = SIZES.map((size) => ({ size, data: renderIcon(size) }));
const ico = buildIco(images);

/* ---------------- 安装向导位图（NSIS 只认未压缩 BMP） ---------------- */

function encodeBmp24(width, height, rgba) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixels = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y += 1) {
    const srcY = height - 1 - y; // BMP 自下而上存储
    for (let x = 0; x < width; x += 1) {
      const src = (srcY * width + x) * 4;
      const dest = y * rowSize + x * 3;
      pixels[dest] = rgba[src + 2];
      pixels[dest + 1] = rgba[src + 1];
      pixels[dest + 2] = rgba[src];
    }
  }

  const fileHeader = Buffer.alloc(14);
  fileHeader.write('BM', 0, 'ascii');
  fileHeader.writeUInt32LE(14 + 40 + pixels.length, 2);
  fileHeader.writeUInt32LE(14 + 40, 10);

  const infoHeader = Buffer.alloc(40);
  infoHeader.writeUInt32LE(40, 0);
  infoHeader.writeInt32LE(width, 4);
  infoHeader.writeInt32LE(height, 8);
  infoHeader.writeUInt16LE(1, 12);
  infoHeader.writeUInt16LE(24, 14);
  infoHeader.writeUInt32LE(0, 16);
  infoHeader.writeUInt32LE(pixels.length, 20);
  infoHeader.writeInt32LE(2835, 24);
  infoHeader.writeInt32LE(2835, 28);

  return Buffer.concat([fileHeader, infoHeader, pixels]);
}

/** 学士帽形状在单位化坐标下的覆盖率（复用图标里的几何） */
function capCoverage(u, v) {
  const capTop = diamondSdf(u, v, 0.5, 0.42, 0.30, 0.175);
  const capBody = Math.abs(u - 0.5) <= 0.20 && v >= 0.54 && v <= 0.635 ? -1 : 1;
  const tasselLine = Math.abs(u - 0.705) <= 0.016 && v >= 0.42 && v <= 0.665 ? -1 : 1;
  const tasselBall = Math.hypot(u - 0.705, v - 0.69) - 0.045;
  return clamp01(0.5 - Math.min(capTop, capBody, tasselLine, tasselBall) * 120);
}

/**
 * 向导左侧品牌图：竖直渐变 + 学士帽 + 细网格
 * 尺寸为 NSIS Modern UI 2 规范：164×314
 */
function renderWizardSide(width, height) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1);
      const v = y / (height - 1);

      // 竖直渐变：深蓝 → 青
      let r = lerp(0x10, 0x0a, v);
      let g = lerp(0x33, 0x8f, v);
      let b = lerp(0x86, 0xd8, v);

      // 斜向高光，避免大色块发闷
      const sheen = Math.max(0, 1 - Math.abs(u * 0.6 + v * 0.4 - 0.45) * 3.2) * 0.18;
      r = lerp(r, 255, sheen);
      g = lerp(g, 255, sheen);
      b = lerp(b, 255, sheen);

      // 细网格
      if (x % 26 === 0 || y % 26 === 0) {
        r = lerp(r, 255, 0.06);
        g = lerp(g, 255, 0.06);
        b = lerp(b, 255, 0.06);
      }

      // 学士帽背后的柔光
      const glow = Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.4) * 2.6) * 0.22;
      if (glow > 0) {
        r = lerp(r, 255, glow);
        g = lerp(g, 255, glow);
        b = lerp(b, 255, glow);
      }

      // 学士帽（居中偏上）
      const cu = (u - 0.5) / 0.66 + 0.5;
      const cv = (v - 0.4) / 0.66 + 0.5;
      const cap = capCoverage(cu, cv);
      if (cap > 0) {
        r = lerp(r, 255, cap);
        g = lerp(g, 255, cap);
        b = lerp(b, 255, cap);
      }

      // 底部三个点缀圆点
      for (const dotU of [0.38, 0.5, 0.62]) {
        const d = Math.hypot(u - dotU, v - 0.62) - 0.021;
        const a = clamp01(0.5 - d * 120) * 0.62;
        if (a > 0) {
          r = lerp(r, 255, a);
          g = lerp(g, 255, a);
          b = lerp(b, 255, a);
        }
      }

      const offset = (y * width + x) * 4;
      rgba[offset] = Math.round(r);
      rgba[offset + 1] = Math.round(g);
      rgba[offset + 2] = Math.round(b);
      rgba[offset + 3] = 255;
    }
  }
  return encodeBmp24(width, height, rgba);
}

/** 页眉图：白底 + 右侧小徽标 + 底部渐变细线（NSIS 规范：150×57） */
function renderWizardHeader(width, height) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1);
      const v = y / (height - 1);
      let r = 255;
      let g = 255;
      let b = 255;

      const logoLeft = 0.76;
      if (u >= logoLeft) {
        const lu = (u - logoLeft) / (1 - logoLeft);
        const size = 0.78;
        const cu = (lu - 0.5) / size + 0.5;
        const cv = (v - 0.47) / size + 0.5;
        const sdf = roundedRectSdf(cu, cv, 0.5, 0.24);
        const plate = clamp01(0.5 - sdf * 90);
        if (plate > 0) {
          const t = clamp01(cu * 0.5 + cv * 0.5);
          r = lerp(r, lerp(0x1f, 0x06, t), plate);
          g = lerp(g, lerp(0x5f, 0xb6, t), plate);
          b = lerp(b, lerp(0xe0, 0xd4, t), plate);
          const cap = capCoverage(cu * 1.25 - 0.12, cv * 1.25 - 0.12);
          if (cap > 0) {
            r = lerp(r, 255, cap);
            g = lerp(g, 255, cap);
            b = lerp(b, 255, cap);
          }
        }
      }

      // 底部渐变细线
      if (v > 0.955) {
        const t = u;
        r = lerp(0x1f, 0x06, t);
        g = lerp(0x5f, 0xb6, t);
        b = lerp(0xe0, 0xd4, t);
      }

      const offset = (y * width + x) * 4;
      rgba[offset] = Math.round(r);
      rgba[offset + 1] = Math.round(g);
      rgba[offset + 2] = Math.round(b);
      rgba[offset + 3] = 255;
    }
  }
  return encodeBmp24(width, height, rgba);
}

const outDir = path.join(root, 'build');
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'icon.ico');
fs.writeFileSync(outFile, ico);
console.log(`[assets] ${path.relative(root, outFile)}  ${SIZES.join('/')} 共 ${SIZES.length} 种尺寸，${(ico.length / 1024).toFixed(1)} KB`);

const sideFile = path.join(outDir, 'wizard-side.bmp');
const side = renderWizardSide(164, 314);
fs.writeFileSync(sideFile, side);
console.log(`[assets] ${path.relative(root, sideFile)}  164×314，${(side.length / 1024).toFixed(1)} KB`);

const headerFile = path.join(outDir, 'wizard-header.bmp');
const header = renderWizardHeader(150, 57);
fs.writeFileSync(headerFile, header);
console.log(`[assets] ${path.relative(root, headerFile)}  150×57，${(header.length / 1024).toFixed(1)} KB`);
