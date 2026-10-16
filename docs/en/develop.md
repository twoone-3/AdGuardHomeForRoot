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
├── pack.ps1              # Windows packaging script
├── pack.sh               # Linux / macOS / CI packaging script
├── version.json          # version and update information
└── changelog.md          # current release notes (also used as the Release body)
```

## Local packaging

`pack.ps1` (Windows) and `pack.sh` (Linux / macOS / CI) do the same thing: download and cache the latest AdGuardHome, then pack it together with `src/` into a module ZIP. CI reuses `pack.sh`.

Windows (requires 7-Zip; the script calls `C:\Program Files\7-Zip\7z.exe`):

```powershell
.\pack.ps1
```

Linux / macOS (requires `curl` or `wget`, `tar`, and one of `zip`, `7z`/`7za`, `python3`):

```shell
./pack.sh          # pack arm64 + armv7
./pack.sh arm64    # pack arm64 only
./pack.sh armv7    # pack armv7 only
```

The script then automatically:

1. Creates the `cache` directory if needed.
2. Downloads and caches the latest AdGuardHome (skipped when the cache already has it).
3. Packs AdGuardHome and the contents of `src/` into a ZIP (`cache/AdGuardHomeForRoot_<arch>.zip`).

The resulting ZIP mirrors the layout of `src/`, with the AdGuardHome binary at `bin/AdGuardHome`. Because AdGuardHome is cached, repeated runs do not download it again.

## CI and releases

Pushing a tag in the form `YYYYMMDD` triggers [`pack.yml`](../../.github/workflows/pack.yml):

1. Validates that the tag is an 8-digit date (`YYYYMMDD`)
2. Builds both architectures via a matrix job calling `pack.sh arm64` / `pack.sh armv7`
3. Creates a GitHub Release whose body comes from `changelog.md` and whose assets are the two ZIPs

Before releasing, update:

- `version.json`: increment `versionCode`, set `version` to `YYYYMMDD`
- `src/module.prop`: `version` and `versionCode`
- `changelog.md`: keep only the **current release** changes, one Chinese and one English entry

## Commit style

The repository uses [Conventional Commits](https://www.conventionalcommits.org/). Common prefixes: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`.
