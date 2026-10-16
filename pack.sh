#!/usr/bin/env bash
# pack.sh - bash version of pack.ps1
#
# Download AdGuardHome binaries (linux arm64 / armv7), extract them
# and pack Magisk/KernelSU modules:
#   cache/AdGuardHomeForRoot_arm64.zip
#   cache/AdGuardHomeForRoot_armv7.zip
#
# Usage:
#   ./pack.sh [arm64|armv7|all]   # default: all
#
# Requirements: curl (or wget), tar, and one of: zip, 7z/7za, python3

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
CACHE_DIR="$SCRIPT_DIR/cache"
SRC_DIR="$SCRIPT_DIR/src"

ARCHS_REQUESTED="${1:-all}"

case "$ARCHS_REQUESTED" in
  all|"") ARCHS="arm64 armv7" ;;
  arm64|armv7) ARCHS="$ARCHS_REQUESTED" ;;
  -h|--help|help)
    echo "Usage: $0 [arm64|armv7|all]"
    exit 0
    ;;
  *)
    echo "Unsupported arch: $ARCHS_REQUESTED (expected: arm64, armv7, all)" >&2
    exit 1
    ;;
esac

get_url() {
  case "$1" in
    arm64) echo "https://github.com/AdguardTeam/AdGuardHome/releases/latest/download/AdGuardHome_linux_arm64.tar.gz" ;;
    armv7) echo "https://github.com/AdguardTeam/AdGuardHome/releases/latest/download/AdGuardHome_linux_armv7.tar.gz" ;;
    *) echo "Unsupported arch: $1" >&2; exit 1 ;;
  esac
}

download_file() {
  local url="$1"
  local dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$dest" "$url"
  else
    echo "Missing download tool: install curl or wget." >&2
    exit 1
  fi
}

command -v tar >/dev/null 2>&1 || { echo "Missing dependency: tar" >&2; exit 1; }
if command -v zip >/dev/null 2>&1; then
  ZIP_TOOL="zip"
elif command -v 7z >/dev/null 2>&1; then
  ZIP_TOOL="7z"
elif command -v 7za >/dev/null 2>&1; then
  ZIP_TOOL="7za"
elif command -v python3 >/dev/null 2>&1; then
  ZIP_TOOL="python3"
else
  echo "Missing zip tool: install zip, 7-Zip (7z), or python3." >&2
  exit 1
fi

# Pack $1=staging dir into $2=output zip (zip root == staging root).
pack_zip() {
  local src_dir="$1"
  local out="$2"
  case "$ZIP_TOOL" in
    zip)
      (cd "$src_dir" && zip -r -9 "$out" .)
      ;;
    7z|7za)
      (cd "$src_dir" && "$ZIP_TOOL" a -tzip "$out" .)
      ;;
    python3)
      python3 - "$src_dir" "$out" <<'EOF'
import os, sys, zipfile
src, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for root, _, files in os.walk(src):
        for name in files:
            full = os.path.join(root, name)
            z.write(full, os.path.relpath(full, src))
EOF
      ;;
  esac
}

mkdir -p "$CACHE_DIR"

echo "Downloading AdGuardHome..."
for arch in $ARCHS; do
  url="$(get_url "$arch")"
  tgz="$CACHE_DIR/AdGuardHome_linux_${arch}.tar.gz"
  if [ ! -f "$tgz" ]; then
    echo "Downloading $url..."
    download_file "$url" "$tgz"
    echo "Download completed successfully."
  else
    echo "File already exists in cache, skipping download: $tgz"
  fi
done

echo "Extracting AdGuardHome..."
for arch in $ARCHS; do
  tgz="$CACHE_DIR/AdGuardHome_linux_${arch}.tar.gz"
  extract_dir="$CACHE_DIR/$arch"
  binary="$extract_dir/AdGuardHome/AdGuardHome"
  if [ ! -f "$binary" ]; then
    mkdir -p "$extract_dir"
    echo "Extracting $tgz..."
    tar -xzf "$tgz" -C "$extract_dir"
    echo "Extraction completed successfully."
  else
    echo "Binary already extracted, skipping: $binary"
  fi
done

echo "Packing AdGuardHome (using $ZIP_TOOL)..."
for arch in $ARCHS; do
  binary="$CACHE_DIR/$arch/AdGuardHome/AdGuardHome"
  output="$CACHE_DIR/AdGuardHomeForRoot_${arch}.zip"

  if [ ! -f "$binary" ]; then
    echo "Binary not found: $binary" >&2
    exit 1
  fi

  rm -f "$output"

  staging="$(mktemp -d)"
  # 双引号让 $staging 在设置 trap 时立即展开，避免 EXIT 时变量已变
  trap "rm -rf $staging" EXIT

  # Same layout as pack.ps1 / .github/workflows/pack.yml:
  # copy src/* to zip root, then place binary at bin/AdGuardHome
  cp -a "$SRC_DIR/." "$staging/"
  mkdir -p "$staging/bin"
  cp -f "$binary" "$staging/bin/AdGuardHome"
  chmod +x "$staging/bin/AdGuardHome"

  pack_zip "$staging" "$output"

  rm -rf "$staging"
  trap - EXIT

  echo "Packed: $output"
done

echo "Packing completed successfully."
