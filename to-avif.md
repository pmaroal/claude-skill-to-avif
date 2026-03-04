# Convertir imágenes a AVIF

Convierte imágenes (JPG, PNG, WebP, TIFF, BMP) a formato AVIF optimizado (~150KB). Skill 100% independiente - solo requiere Node.js instalado.

## Instrucciones

El usuario quiere convertir imágenes a formato AVIF. El argumento `$ARGUMENTS` contiene las rutas o patrones glob de las imágenes a convertir. Si no se proporcionan argumentos, pregunta qué imágenes quiere convertir.

### Paso 1: Identificar las imágenes origen

Usa `$ARGUMENTS` para localizar las imágenes. Puede ser:
- Rutas absolutas o relativas a archivos específicos (ej: `./public/hero.jpg`)
- Patrones glob (ej: `./public/images/*.png`)
- Un directorio completo (ej: `./public/images/`)
- Si no hay argumentos, pregunta al usuario qué imágenes quiere convertir.

Las extensiones soportadas son: `.jpg`, `.jpeg`, `.png`, `.webp`, `.tiff`, `.bmp`

Usa las herramientas Glob y Read para localizar las imágenes. Guarda un mapeo mental de cada imagen: `nombre_archivo -> ruta_completa_origen`.

### Paso 2: Crear directorio temporal de trabajo

```bash
WORK_DIR=$(mktemp -d)
echo "Directorio temporal: $WORK_DIR"
```

### Paso 3: Instalar sharp en el directorio temporal

```bash
cd "$WORK_DIR" && npm init -y --silent > /dev/null 2>&1 && npm install sharp --silent 2>&1 | tail -1
```

### Paso 4: Crear el script de conversión

Escribe el siguiente archivo en `$WORK_DIR/convert.js` usando la herramienta Write:

```javascript
'use strict';
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  TARGET_KB: 150,
  MIN_KB: 120,
  MAX_KB: 200,
  QUALITY_MIN: 10,
  QUALITY_MAX: 90,
  MAX_ITERATIONS: 15,
};

const KB = 1024;

async function findOptimalQuality(inputBuffer) {
  const targetBytes = CONFIG.TARGET_KB * KB;
  const minBytes = CONFIG.MIN_KB * KB;
  const maxBytes = CONFIG.MAX_KB * KB;
  let lo = CONFIG.QUALITY_MIN;
  let hi = CONFIG.QUALITY_MAX;
  let bestBuffer = null;
  let bestQuality = null;
  let bestDiff = Infinity;

  for (let i = 0; i < CONFIG.MAX_ITERATIONS; i++) {
    const quality = Math.round((lo + hi) / 2);
    const avifBuffer = await sharp(inputBuffer)
      .avif({ quality, effort: 4, chromaSubsampling: '4:2:0' })
      .toBuffer();
    const size = avifBuffer.length;
    const diff = Math.abs(size - targetBytes);

    if (size >= minBytes && size <= maxBytes) {
      if (diff < bestDiff) {
        bestBuffer = avifBuffer;
        bestQuality = quality;
        bestDiff = diff;
      }
      if (diff < targetBytes * 0.02) break;
    }

    if (bestBuffer === null || diff < bestDiff) {
      bestBuffer = avifBuffer;
      bestQuality = quality;
      bestDiff = diff;
    }

    if (size > maxBytes) hi = quality - 1;
    else if (size < minBytes) lo = quality + 1;
    else if (size > targetBytes) hi = quality - 1;
    else lo = quality + 1;

    if (lo > hi) break;
  }
  return { buffer: bestBuffer, quality: bestQuality };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node convert.js <image1> <image2> ...');
    process.exit(1);
  }

  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const results = [];

  for (const inputPath of args) {
    const filename = path.basename(inputPath);
    const nameNoExt = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, nameNoExt + '.avif');

    try {
      const inputBuffer = fs.readFileSync(inputPath);
      const inputSize = inputBuffer.length;
      const metadata = await sharp(inputBuffer).metadata();
      const { buffer: avifBuffer, quality } = await findOptimalQuality(inputBuffer);

      fs.writeFileSync(outputPath, avifBuffer);
      const outputSize = avifBuffer.length;
      const reduction = ((inputSize - outputSize) / inputSize * 100).toFixed(1);

      results.push({
        input: filename,
        output: nameNoExt + '.avif',
        outputPath,
        inputSize,
        outputSize,
        quality,
        reduction,
        width: metadata.width,
        height: metadata.height,
        ok: true,
      });
    } catch (err) {
      results.push({ input: filename, ok: false, error: err.message });
    }
  }

  console.log(JSON.stringify(results));
}

main();
```

### Paso 5: Copiar imágenes y ejecutar conversión

Copia cada imagen identificada en el Paso 1 al directorio temporal `$WORK_DIR/` y luego ejecuta:

```bash
cd "$WORK_DIR" && node convert.js <ruta_img1_en_workdir> <ruta_img2_en_workdir> ...
```

El script imprime un JSON con los resultados. Parsea ese JSON para obtener la info de cada imagen.

### Paso 6: Copiar los AVIF al proyecto de origen

Para cada imagen convertida exitosamente:
- Copia el `.avif` desde `$WORK_DIR/output/<nombre>.avif` al mismo directorio donde estaba la imagen original en el proyecto.
- Ejemplo: si `./public/images/hero.jpg` fue convertida, copia el resultado a `./public/images/hero.avif`.

**NO eliminar** las imágenes originales automáticamente. Pregunta al usuario si quiere eliminarlas.

### Paso 7: Limpiar directorio temporal

```bash
rm -rf "$WORK_DIR"
```

### Paso 8: Mostrar resumen

Muestra una tabla con:
- Nombre del archivo original → nombre AVIF
- Tamaño original → tamaño AVIF
- Porcentaje de reducción
- Calidad AVIF usada
- Total de peso ahorrado

### Paso 9: Ofrecer actualizar referencias

Si el proyecto contiene archivos de código (HTML, CSS, JS, TS, TSX, JSX, MDX, etc.), pregunta al usuario si quiere buscar y reemplazar las referencias a las imágenes originales (.jpg, .png, etc.) por las nuevas (.avif) en el código fuente.

Si acepta, usa Grep para encontrar las referencias y Edit para actualizarlas.

### Notas importantes
- Si alguna imagen falla, reporta el error pero continúa con las demás.
- Siempre trabaja con copias, nunca muevas los originales hasta confirmar éxito.
- Objetivo de peso: ~150KB (rango 120-200KB). Si una imagen original ya pesa menos de 120KB, conviértela igualmente pero advierte que puede no reducirse mucho.
- Esta skill es 100% independiente. No depende de ningún proyecto externo. Solo necesita Node.js instalado en el sistema.

### Instalación para otros compañeros

Para que otro compañero pueda usar esta skill, solo necesita copiar este archivo a:
```
~/.claude/commands/to-avif.md
```

Uso: `/to-avif ./ruta/a/imagenes/*.jpg`
