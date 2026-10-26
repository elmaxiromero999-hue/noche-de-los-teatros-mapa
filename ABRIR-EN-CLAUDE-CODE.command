#!/bin/zsh -l
# Doble clic: abre Claude Code en esta carpeta, en modo ahorro de tokens
# (Sonnet como modelo principal, Haiku para subagentes). Lee CLAUDE.md solo.
cd "$(dirname "$0")" || exit 1
[ -f ~/.zshrc ] && source ~/.zshrc 2>/dev/null
export PATH="$HOME/.local/bin:$HOME/.claude/local:$HOME/.npm-global/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
CLAUDE_BIN="$(command -v claude)"
if [ -z "$CLAUDE_BIN" ]; then
  CLAUDE_BIN="$(ls -d "$HOME"/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude 2>/dev/null | tail -1)"
fi
if [ -z "$CLAUDE_BIN" ]; then
  echo "No encontré Claude Code instalado para la terminal."
  echo "Instalalo con:  curl -fsSL https://claude.ai/install.sh | bash"
  echo "y después volvé a hacer doble clic en este archivo."
  read -k1
  exit 1
fi
export CLAUDE_CODE_SUBAGENT_MODEL=haiku
"$CLAUDE_BIN" --model sonnet "Leé PROMPT-INICIO.md y hacelo"
