#!/bin/bash
set -e

# ─── Claude Code Skill Installer: to-avif ───────────────────────────────────
# Convierte imágenes a AVIF optimizado (~150KB) desde cualquier proyecto.
# ─────────────────────────────────────────────────────────────────────────────

SKILL_NAME="to-avif"
COMMANDS_DIR="$HOME/.claude/commands"
SKILL_URL="https://raw.githubusercontent.com/pmaroal/claude-skill-to-avif/main/to-avif.md"

# Colores
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   Claude Code Skill Installer: to-avif       ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que node está instalado
if ! command -v node &> /dev/null; then
  echo -e "${RED}✖  Node.js no está instalado.${NC}"
  echo -e "   Instálalo desde: https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✔${NC}  Node.js detectado: ${BOLD}$NODE_VERSION${NC}"

# Crear directorio de comandos si no existe
mkdir -p "$COMMANDS_DIR"

# Descargar la skill
echo -e "${CYAN}⟳${NC}  Descargando skill ${BOLD}/$SKILL_NAME${NC}..."

if command -v curl &> /dev/null; then
  curl -sSL "$SKILL_URL" -o "$COMMANDS_DIR/$SKILL_NAME.md"
elif command -v wget &> /dev/null; then
  wget -q "$SKILL_URL" -O "$COMMANDS_DIR/$SKILL_NAME.md"
else
  echo -e "${RED}✖  Se necesita curl o wget para descargar la skill.${NC}"
  exit 1
fi

# Verificar descarga
if [ -f "$COMMANDS_DIR/$SKILL_NAME.md" ] && [ -s "$COMMANDS_DIR/$SKILL_NAME.md" ]; then
  echo -e "${GREEN}✔${NC}  Skill instalada en: ${BOLD}$COMMANDS_DIR/$SKILL_NAME.md${NC}"
else
  echo -e "${RED}✖  Error al descargar la skill.${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}${BOLD}¡Instalación completada!${NC}"
echo ""
echo -e "  Uso:  ${BOLD}/to-avif ./ruta/a/imagenes/*.jpg${NC}"
echo -e "  Más:  ${BOLD}/to-avif ./public/images/${NC}"
echo ""
