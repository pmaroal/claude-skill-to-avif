'use strict';

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────
const CONFIG = {
  TARGET_KB: 150,      // Peso objetivo en KB
  MIN_KB: 120,         // Mínimo aceptable en KB
  MAX_KB: 200,         // Máximo aceptable en KB
  QUALITY_MIN: 10,     // Calidad mínima AVIF (1-100)
  QUALITY_MAX: 90,     // Calidad máxima AVIF (1-100)
  MAX_ITERATIONS: 15,  // Iteraciones máximas de búsqueda binaria
};

// ─── SELECTOR DE CARPETA (macOS Finder) ─────────────────────────────────────
function pickFolder() {
  const scriptFile = path.join(require('os').tmpdir(), `pick-folder-${Date.now()}.scpt`);
  const script = [
    'tell application "System Events"',
    '  activate',
    '  set theFolder to choose folder with prompt "Selecciona la carpeta con las imágenes a convertir"',
    '  return POSIX path of theFolder',
    'end tell',
  ].join('\n');

  try {
    fs.writeFileSync(scriptFile, script, 'utf-8');
    const result = execSync(`osascript "${scriptFile}" 2>&1`, {
      encoding: 'utf-8',
      timeout: 120000,
    });
    return result.trim();
  } catch {
    return null;
  } finally {
    try { fs.unlinkSync(scriptFile); } catch {}
  }
}

// ─── UTILIDADES ─────────────────────────────────────────────────────────────
const KB = 1024;
const fmt = (bytes) => `${(bytes / KB).toFixed(1)} KB`;
const fmtPct = (n) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

const log = {
  info:    (msg) => console.log(`${colors.cyan}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✔${colors.reset}  ${msg}`),
  warn:    (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error:   (msg) => console.log(`${colors.red}✖${colors.reset}  ${msg}`),
  dim:     (msg) => console.log(`${colors.gray}   ${msg}${colors.reset}`),
  title:   (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`),
  divider: ()    => console.log(`${colors.gray}${'─'.repeat(60)}${colors.reset}`),
};

// ─── BÚSQUEDA BINARIA DE CALIDAD ─────────────────────────────────────────────
async function findOptimalQuality(inputBuffer, metadata) {
  const targetBytes = CONFIG.TARGET_KB * KB;
  const minBytes    = CONFIG.MIN_KB * KB;
  const maxBytes    = CONFIG.MAX_KB * KB;

  let lo = CONFIG.QUALITY_MIN;
  let hi = CONFIG.QUALITY_MAX;
  let bestBuffer  = null;
  let bestQuality = null;
  let bestDiff    = Infinity;

  for (let i = 0; i < CONFIG.MAX_ITERATIONS; i++) {
    const quality = Math.round((lo + hi) / 2);

    const avifBuffer = await sharp(inputBuffer)
      .avif({ quality, effort: 4, chromaSubsampling: '4:2:0' })
      .toBuffer();

    const size = avifBuffer.length;
    const diff = Math.abs(size - targetBytes);

    log.dim(`  iter ${String(i + 1).padStart(2)}: q=${String(quality).padStart(3)} → ${fmt(size)}`);

    // ¿Dentro del rango aceptable?
    if (size >= minBytes && size <= maxBytes) {
      // Elegir el más cercano al objetivo dentro del rango
      if (diff < bestDiff) {
        bestBuffer  = avifBuffer;
        bestQuality = quality;
        bestDiff    = diff;
      }
      // Si ya está muy cerca del target, parar
      if (diff < targetBytes * 0.02) break;
    }

    // Actualizar el mejor encontrado aunque esté fuera del rango
    if (bestBuffer === null || diff < bestDiff) {
      bestBuffer  = avifBuffer;
      bestQuality = quality;
      bestDiff    = diff;
    }

    if (size > maxBytes) {
      hi = quality - 1;
    } else if (size < minBytes) {
      lo = quality + 1;
    } else {
      // Dentro del rango: afinar hacia el target
      if (size > targetBytes) hi = quality - 1;
      else                    lo = quality + 1;
    }

    if (lo > hi) break;
  }

  return { buffer: bestBuffer, quality: bestQuality };
}

// ─── CONVERSIÓN DE UNA IMAGEN ─────────────────────────────────────────────
async function convertImage(inputPath, outputDir) {
  const filename   = path.basename(inputPath);
  const ext        = path.extname(inputPath).toLowerCase();
  const nameNoExt  = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${nameNoExt}.avif`);
  const isAvif     = ext === '.avif';

  const inputBuffer = fs.readFileSync(inputPath);
  const inputSize   = inputBuffer.length;
  const metadata    = await sharp(inputBuffer).metadata();

  // AVIF ya en rango → skip
  if (isAvif && inputSize >= CONFIG.MIN_KB * KB && inputSize <= CONFIG.MAX_KB * KB) {
    log.success(
      `${colors.bright}${filename}${colors.reset}  ` +
      `${fmt(inputSize)}  ${colors.green}[✓ ya en rango, omitido]${colors.reset}`
    );
    return {
      input: filename,
      output: filename,
      inputSize,
      outputSize: inputSize,
      quality: null,
      inRange: true,
      skipped: true,
      width: metadata.width,
      height: metadata.height,
    };
  }

  log.info(`Procesando: ${colors.bright}${filename}${colors.reset}`);
  log.dim(`  Original: ${fmt(inputSize)} — ${metadata.width}×${metadata.height}px (${metadata.format})`);

  const { buffer: avifBuffer, quality } = await findOptimalQuality(inputBuffer, metadata);

  fs.writeFileSync(outputPath, avifBuffer);

  const outputSize = avifBuffer.length;
  const reduction  = ((inputSize - outputSize) / inputSize) * 100;
  const inRange    = outputSize >= CONFIG.MIN_KB * KB && outputSize <= CONFIG.MAX_KB * KB;
  const statusFn   = inRange ? log.success : log.warn;
  const rangeTag   = inRange
    ? `${colors.green}[✓ en rango]${colors.reset}`
    : `${colors.yellow}[⚠ fuera de rango]${colors.reset}`;

  statusFn(
    `${colors.bright}${nameNoExt}.avif${colors.reset}  ` +
    `${fmt(inputSize)} → ${colors.bright}${fmt(outputSize)}${colors.reset}  ` +
    `(${fmtPct(-reduction)})  q=${quality}  ${rangeTag}`
  );

  return {
    input: filename,
    output: `${nameNoExt}.avif`,
    inputSize,
    outputSize,
    quality,
    inRange,
    skipped: false,
    width: metadata.width,
    height: metadata.height,
  };
}

// ─── PROGRAMA PRINCIPAL ───────────────────────────────────────────────────
async function main() {
  log.title('╔══════════════════════════════════════════╗');
  log.title('║     IMG → AVIF  ·  Control de peso       ║');
  log.title('╚══════════════════════════════════════════╝');

  console.log(`\n  Objetivo: ${colors.bright}${CONFIG.TARGET_KB} KB${colors.reset}  ` +
              `(rango ${CONFIG.MIN_KB}–${CONFIG.MAX_KB} KB)\n`);

  // Seleccionar carpeta con Finder
  log.info('Abriendo selector de carpeta…');
  const selectedDir = pickFolder();

  if (!selectedDir) {
    log.warn('No se seleccionó ninguna carpeta. Saliendo.');
    return;
  }

  if (!fs.existsSync(selectedDir) || !fs.statSync(selectedDir).isDirectory()) {
    log.error(`La ruta seleccionada no es una carpeta válida: ${selectedDir}`);
    return;
  }

  log.success(`Carpeta seleccionada: ${colors.bright}${selectedDir}${colors.reset}`);

  // Buscar imágenes
  const supported = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp', '.avif'];
  const files = fs.readdirSync(selectedDir).filter((f) =>
    supported.includes(path.extname(f).toLowerCase())
  );

  if (files.length === 0) {
    log.warn(`No se encontraron imágenes en ${colors.bright}${selectedDir}${colors.reset}`);
    console.log(`\n  Formatos soportados: ${supported.join(', ')}`);
    console.log(`  Asegúrate de que la carpeta contiene imágenes y vuelve a ejecutar.\n`);
    return;
  }

  log.info(`${files.length} imagen(es) encontrada(s)\n`);
  log.divider();

  const results = [];
  let errors = 0;

  for (const file of files) {
    const inputPath = path.join(selectedDir, file);
    try {
      const result = await convertImage(inputPath, selectedDir);
      results.push(result);
      // Eliminar original solo si no era ya un AVIF (para AVIF se sobreescribe en sitio)
      if (!result.skipped && path.extname(file).toLowerCase() !== '.avif') {
        fs.unlinkSync(inputPath);
        log.dim(`  Eliminado original: ${file}`);
      }
    } catch (err) {
      log.error(`Error procesando "${file}": ${err.message}`);
      errors++;
    }
    log.divider();
  }

  // ─── RESUMEN ──────────────────────────────────────────────────────────────
  if (results.length === 0) return;

  const processed  = results.filter((r) => !r.skipped);
  const skipped    = results.filter((r) => r.skipped);
  const totalIn    = processed.reduce((s, r) => s + r.inputSize, 0);
  const totalOut   = processed.reduce((s, r) => s + r.outputSize, 0);
  const inRange    = results.filter((r) => r.inRange).length;
  const reduction  = totalIn > 0 ? ((totalIn - totalOut) / totalIn) * 100 : 0;

  log.title('RESUMEN');
  console.log(`  Imágenes procesadas : ${results.length}  (errores: ${errors})`);
  if (skipped.length > 0) {
    console.log(`  AVIF ya en rango    : ${colors.cyan}${skipped.length}${colors.reset} (omitidas)`);
  }
  console.log(`  Dentro del rango    : ${colors.green}${inRange}${colors.reset} / ${results.length}`);
  console.log(`  Peso total entrada  : ${fmt(totalIn)}`);
  console.log(`  Peso total salida   : ${colors.bright}${fmt(totalOut)}${colors.reset}`);
  console.log(`  Reducción total     : ${colors.green}${fmtPct(-reduction)}${colors.reset}\n`);

  if (inRange < results.length) {
    log.warn('Algunas imágenes quedaron fuera del rango. Puede ajustar MIN_KB/MAX_KB/TARGET_KB en el archivo convert.js\n');
  }

  console.log(`  Archivos guardados en: ${colors.bright}${selectedDir}${colors.reset}\n`);

  // Abrir la carpeta en Finder al finalizar
  try {
    execSync(`open "${selectedDir}"`);
  } catch {}
}

main().catch((err) => {
  log.error(`Error fatal: ${err.message}`);
  process.exit(1);
});
