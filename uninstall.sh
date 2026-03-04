#!/bin/bash
set -e

SKILL_NAME="to-avif"
SKILL_PATH="$HOME/.claude/commands/$SKILL_NAME.md"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

if [ -f "$SKILL_PATH" ]; then
  rm "$SKILL_PATH"
  echo -e "${GREEN}✔${NC}  Skill ${BOLD}/$SKILL_NAME${NC} desinstalada correctamente."
else
  echo -e "${YELLOW}⚠${NC}  La skill ${BOLD}/$SKILL_NAME${NC} no estaba instalada."
fi
