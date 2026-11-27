# Development and Packaging

[← Back to documentation index](../index.md)

For developers. Regular users should start at the [documentation index](../index.md).

## Layout

```text
.
├── src/                  # module sources (mapped to the ZIP root when packing)
│   ├── bin/              # AdGuardHome.yaml and other runtime files
│   ├── scripts/          # tool.sh / iptables.sh / inotify.sh / debug.sh / base.sh
│   ├── webroot/          # module web UI
│   ├── customize.sh      # installer (keep/backup logic for config files)
│   ├── service.sh        # boot service
│   ├── action.sh         # root manager action button
│   ├── uninstall.sh      # uninstaller
│   ├── settings.conf     # module configuration
│   ├── module.prop       # module metadata
│   └── META-INF/         # installer
├── docs/                 # user documentation (index.md is the entry, zh/ and en/ hold each language)
├── cache/                # packaging cache and output (git-ignored)
├── adguardhome.lock      # AdGuardHome core tag and SHA-256 for both architectures
├── pack.ps1              # Windows packaging script
├── pack.sh               # Linux / macOS / CI packaging script
├── version.json          # version and update information
└── changelog.md          # current release notes (also used as the Release body)
```

## Local packaging

`pack.ps1` (Windows) and `pack.sh` (Linux / macOS / CI) both use the tag and SHA-256 hashes pinned in `adguardhome.lock`. To update the core, update that file using the upstream release tag and its `checksums.txt`.

Windows (requires `tar` and 7-Zip on PATH or in `C:\Program Files\7-Zip`):

```powershell
.\pack.ps1
```

Linux / macOS (requires `curl` or `wget`, `tar`, `sha256sum` or `shasum`, and one of `zip`/`7z`/`7za`/`python3`):

```shell
bash pack.sh          # pack arm64 + armv7
bash pack.sh arm64    # pack arm64 only
bash pack.sh armv7    # pack armv7 only
```

The packers reuse a verified archive from `cache/<core tag>/` or download it again if it is missing or fails verification. The resulting ZIP (`cache/AdGuardHomeForRoot_<arch>.zip`) mirrors `src/`, with the binary at `bin/AdGuardHome`.

On Linux, `bash tests/release-smoke.sh` runs offline packaging and upgrade checks (requires `zip`, `unzip`, and `sha256sum`).

## CI and releases

Pushing a tag in the form `YYYYMMDD` triggers [`pack.yml`](../../.github/workflows/pack.yml), which only publishes releases:

1. Validates that the tag is an 8-digit date (`YYYYMMDD`)
2. Runs `pack.sh all` to build both architectures
3. Creates a GitHub Release whose body comes from `changelog.md` and whose assets are the two ZIPs in `cache/`

The workflow can also be run manually, in which case it only verifies packaging and produces nothing downloadable. No build artifacts are uploaded to Actions: installable module ZIPs come only from Releases, use `pack.sh` for local builds.

Before releasing, update:

- `version.json`: increment `versionCode`, set `version` to `YYYYMMDD`
- `src/module.prop`: `version` and `versionCode`
- `changelog.md`: keep only the **current release** changes, one Chinese and one English entry

## Commit style

The repository uses [Conventional Commits](https://www.conventionalcommits.org/). Common prefixes: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`.
