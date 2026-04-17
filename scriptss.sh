#!/bin/zsh

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title image-to-avif
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🤖

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/Library/pnpm:$HOME/.local/share/pnpm:$PATH"

PROJECT_DIR="/Users/pedromanuelrodriguezalbiach/MARKETEC360/PROJECTS/img to avif"

cd "$PROJECT_DIR" && pnpm start

