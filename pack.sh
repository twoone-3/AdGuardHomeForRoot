#!/usr/bin/env bash
# pack.sh - bash version of pack.ps1
#
# Download AdGuardHome binaries (linux arm64 / armv7), extract them
# and pack Magisk/KernelSU modules:
#   cache/AdGuardHomeForRoot_arm64.zip
#   cache/AdGuardHomeForRoot_armv7.zip
#
# Usage:
#   bash pack.sh [arm64|armv7|all]   # default: all
#
# Requirements: curl (or wget), tar, sha256sum (or shasum), and zip, 7z/7za, or python3

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

LOCK_FILE="$SCRIPT_DIR/adguardhome.lock"
AGH_VERSION="$(sed -n 's/^version=//p' "$LOCK_FILE")"
if [[ ! "$AGH_VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid AdGuardHome version in $LOCK_FILE: $AGH_VERSION" >&2
  exit 1
fi
AGH_CACHE_DIR="$CACHE_DIR/$AGH_VERSION"

if command -v sha256sum >/dev/null 2>&1; then
  HASH_TOOL=(sha256sum)
elif command -v shasum >/dev/null 2>&1; then
  HASH_TOOL=(shasum -a 256)
else
  echo "Missing dependency: sha256sum or shasum" >&2
  exit 1
fi

archive_matches() {
  printf '%s  %s\n' "$2" "$1" | "${HASH_TOOL[@]}" -c --status -
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

mkdir -p "$AGH_CACHE_DIR"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

echo "Downloading AdGuardHome $AGH_VERSION..."
for arch in $ARCHS; do
  asset="AdGuardHome_linux_${arch}.tar.gz"
  url="https://github.com/AdguardTeam/AdGuardHome/releases/download/$AGH_VERSION/$asset"
  tgz="$AGH_CACHE_DIR/$asset"
  digest="$(sed -n "s/^$arch=//p" "$LOCK_FILE")"
  if [[ ! "$digest" =~ ^[a-f0-9]{64}$ ]]; then
    echo "Invalid SHA-256 for $arch in $LOCK_FILE" >&2
    exit 1
  fi

  if [ -f "$tgz" ] && archive_matches "$tgz" "$digest"; then
    echo "File already exists in cache, skipping download: $tgz"
  else
    echo "Downloading $url..."
    download_file "$url" "$work_dir/$asset"
    if ! archive_matches "$work_dir/$asset" "$digest"; then
      echo "SHA-256 mismatch for $asset" >&2
      exit 1
    fi
    mv -f "$work_dir/$asset" "$tgz"
    echo "Download completed successfully."
  fi
done

echo "Extracting AdGuardHome..."
for arch in $ARCHS; do
  tgz="$AGH_CACHE_DIR/AdGuardHome_linux_${arch}.tar.gz"
  extract_dir="$work_dir/$arch"
  mkdir -p "$extract_dir"
  echo "Extracting $tgz..."
  tar -xzf "$tgz" -C "$extract_dir"
  echo "Extraction completed successfully."
done

echo "Packing AdGuardHome (using $ZIP_TOOL)..."
# Same layout as pack.ps1 / .github/workflows/pack.yml:
# copy src/* to zip root, then place binary at bin/AdGuardHome
staging="$work_dir/module"
mkdir -p "$staging/bin"
cp -a "$SRC_DIR/." "$staging/"
for arch in $ARCHS; do
  binary="$work_dir/$arch/AdGuardHome/AdGuardHome"
  output="$CACHE_DIR/AdGuardHomeForRoot_${arch}.zip"

  if [ ! -f "$binary" ]; then
    echo "Binary not found: $binary" >&2
    exit 1
  fi

  rm -f "$output"
  cp -f "$binary" "$staging/bin/AdGuardHome"
  chmod +x "$staging/bin/AdGuardHome"

  pack_zip "$staging" "$output"
  echo "Packed: $output"
done

echo "Packing completed successfully."
