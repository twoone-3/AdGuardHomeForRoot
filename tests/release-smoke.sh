#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

TEST_DIR="$(mktemp -d)"
TEST_TAG=v99.0.0
trap 'rm -rf "$TEST_DIR"' EXIT
export TEST_DIR TEST_TAG

curl() {
  [[ "${OFFLINE:-0}" = 0 && "$2" = */download/"$TEST_TAG"/* && "$3" = -o ]] || return 1
  cp "$TEST_DIR/mirror/${2##*/}" "$4"
}
export -f curl

cp -r pack.sh src "$TEST_DIR/"
mkdir -p "$TEST_DIR/"{cache,mirror,fixture/AdGuardHome}
printf 'version=%s\n' "$TEST_TAG" > "$TEST_DIR/adguardhome.lock"
for arch in arm64 armv7; do
  asset="AdGuardHome_linux_${arch}.tar.gz"
  printf 'stale\n' > "$TEST_DIR/cache/$asset"
  mkdir -p "$TEST_DIR/cache/$arch/AdGuardHome"
  printf 'stale\n' > "$TEST_DIR/cache/$arch/AdGuardHome/AdGuardHome"
  printf '%s\n' "$arch" > "$TEST_DIR/fixture/AdGuardHome/AdGuardHome"
  tar -czf "$TEST_DIR/mirror/$asset" -C "$TEST_DIR/fixture" AdGuardHome
  sha="$(sha256sum "$TEST_DIR/mirror/$asset")"
  printf '%s=%s\n' "$arch" "${sha%% *}" >> "$TEST_DIR/adguardhome.lock"
done

bash "$TEST_DIR/pack.sh" all >/dev/null
OFFLINE=1 bash "$TEST_DIR/pack.sh" all >/dev/null
for arch in arm64 armv7; do
  [ "$(unzip -p "$TEST_DIR/cache/AdGuardHomeForRoot_${arch}.zip" bin/AdGuardHome)" = "$arch" ]
done
asset=AdGuardHome_linux_armv7.tar.gz
printf 'bad cached file\n' > "$TEST_DIR/cache/$TEST_TAG/$asset"
bash "$TEST_DIR/pack.sh" armv7 >/dev/null
cmp "$TEST_DIR/mirror/$asset" "$TEST_DIR/cache/$TEST_TAG/$asset"
rm "$TEST_DIR/cache/$TEST_TAG/$asset" "$TEST_DIR/cache/AdGuardHomeForRoot_armv7.zip"
printf 'bad download\n' > "$TEST_DIR/mirror/$asset"
if bash "$TEST_DIR/pack.sh" armv7 > "$TEST_DIR/pack.log" 2>&1; then
  echo 'Packaging unexpectedly accepted a bad download' >&2
  exit 1
fi
grep -q 'SHA-256 mismatch' "$TEST_DIR/pack.log"
[ ! -e "$TEST_DIR/cache/AdGuardHomeForRoot_armv7.zip" ]

# Run the installer with an isolated filesystem and a simulated Volume Up key.
export ARCH=arm64 ZIPFILE="$TEST_DIR/cache/AdGuardHomeForRoot_arm64.zip"
export MODPATH="$TEST_DIR/module" TMPDIR="$TEST_DIR"
getprop() { echo en; }
ui_print() { :; }
abort() { echo "$1" >&2; exit 1; }
timeout() { echo KEY_VOLUMEUP; }
chown() { :; }
export -f getprop ui_print abort timeout chown
sed "s|/data/adb/agh|$TEST_DIR/agh|; s|/proc/\[0-9\]\*|$TEST_DIR/proc/[0-9]*|" src/customize.sh > "$TEST_DIR/customize.sh"
mkdir -p "$MODPATH" "$TEST_DIR/agh/bin" "$TEST_DIR/proc/1"
echo init > "$TEST_DIR/proc/1/comm"
config="$TEST_DIR/agh/bin/AdGuardHome.yaml"
backup="$config.pre-v1.0.0"
printf '# user config\nschema_version: 34\n' > "$TEST_DIR/legacy.yaml"
cp "$TEST_DIR/legacy.yaml" "$config"
printf 'redir_port=6222\n' > "$TEST_DIR/agh/settings.conf"
bash "$TEST_DIR/customize.sh"
cmp "$TEST_DIR/legacy.yaml" "$config"
cmp "$TEST_DIR/legacy.yaml" "$backup"
grep -qx 'redir_port=6222' "$TEST_DIR/agh/settings.conf"
printf 'schema_version: 35\n' > "$config"
bash "$TEST_DIR/customize.sh"
grep -qx 'schema_version: 35' "$config"
cmp "$TEST_DIR/legacy.yaml" "$backup"
echo 'Packaging and upgrade checks passed.'
