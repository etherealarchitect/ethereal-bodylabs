#!/usr/bin/env bash
set -euo pipefail

echo "Ethereal Bodylabs iOS environment check"
echo "--------------------------------------"
printf "OS: "; uname -s
printf "Architecture: "; uname -m
printf "Node: "; command -v node >/dev/null 2>&1 && node --version || echo "not installed"
printf "npm: "; command -v npm >/dev/null 2>&1 && npm --version || echo "not installed"
printf "Xcode: "; command -v xcodebuild >/dev/null 2>&1 && xcodebuild -version | tr '\n' ' ' || echo "not installed / macOS required"
printf "\n"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Native iOS compilation and signing require macOS with Xcode."
  exit 2
fi

command -v xcodebuild >/dev/null || { echo "Install Xcode and its command-line tools."; exit 2; }
command -v node >/dev/null || { echo "Install Node.js before syncing the Capacitor app."; exit 2; }
command -v npm >/dev/null || { echo "npm is required."; exit 2; }

if [[ -f package.json ]]; then
  node -e "const p=require('./package.json'); console.log('Package:',p.name||'(unnamed)'); console.log('iOS scripts:',Object.keys(p.scripts||{}).filter(k=>k.startsWith('ios:')).join(', ')||'(none)')"
fi

if [[ -d ios ]]; then
  echo "iOS directory: present"
else
  echo "iOS directory: not present yet; run npx cap add ios after dependencies are installed."
fi

echo "Environment check complete."
