# /to-avif — Claude Code Skill

Skill para [Claude Code](https://docs.anthropic.com/en/docs/claude-code) que convierte imágenes (JPG, PNG, WebP, TIFF, BMP) a formato **AVIF** optimizado (~150KB) directamente desde cualquier proyecto.

## Instalación

Un solo comando:

```bash
curl -sSL https://raw.githubusercontent.com/pmaroal/claude-skill-to-avif/main/install.sh | bash
```

### Instalación manual

Copia el archivo `to-avif.md` a tu directorio de comandos de Claude Code:

```bash
mkdir -p ~/.claude/commands
curl -sSL https://raw.githubusercontent.com/pmaroal/claude-skill-to-avif/main/to-avif.md -o ~/.claude/commands/to-avif.md
```

## Uso

Desde cualquier proyecto en Claude Code:

```bash
# Convertir imágenes específicas
/to-avif ./public/images/hero.jpg ./public/images/banner.png

# Convertir todas las imágenes de un directorio
/to-avif ./public/images/

# Convertir con patrón glob
/to-avif ./src/assets/*.png

# Sin argumentos: te pregunta qué imágenes convertir
/to-avif
```

## Qué hace

1. Identifica las imágenes que quieres convertir
2. Crea un directorio temporal e instala `sharp` automáticamente
3. Convierte cada imagen a AVIF con búsqueda binaria de calidad (objetivo ~150KB)
4. Copia los `.avif` junto a las imágenes originales en tu proyecto
5. Limpia el directorio temporal
6. Te pregunta si quieres eliminar los originales y actualizar referencias en el código

## Requisitos

- [Node.js](https://nodejs.org) (v18+)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

## Configuración

La skill usa estos valores por defecto (editables en `~/.claude/commands/to-avif.md`):

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| TARGET_KB | 150 | Peso objetivo en KB |
| MIN_KB | 120 | Mínimo aceptable en KB |
| MAX_KB | 200 | Máximo aceptable en KB |

## Desinstalación

```bash
curl -sSL https://raw.githubusercontent.com/pmaroal/claude-skill-to-avif/main/uninstall.sh | bash
```

O manualmente:

```bash
rm ~/.claude/commands/to-avif.md
```

## Formatos soportados

| Entrada | Salida |
|---------|--------|
| `.jpg` / `.jpeg` | `.avif` |
| `.png` | `.avif` |
| `.webp` | `.avif` |
| `.tiff` | `.avif` |
| `.bmp` | `.avif` |
