$ErrorActionPreference = 'Stop'

$Lock = Get-Content -Raw -LiteralPath "$PSScriptRoot\adguardhome.lock" | ConvertFrom-StringData
$Version = $Lock.version
if ($Version -cnotmatch '^v[0-9]+\.[0-9]+\.[0-9]+$') {
  throw "Invalid AdGuardHome version in adguardhome.lock: $Version"
}

$CacheDir = "$PSScriptRoot\cache"
$CoreCache = Join-Path $CacheDir $Version
$ReleaseUrl = "https://github.com/AdguardTeam/AdGuardHome/releases/download/$Version"
$env:PATH += ';C:\Program Files\7-Zip'

function Get-ArchiveHash([string]$Path) {
  $Sha256 = [Security.Cryptography.SHA256]::Create()
  $Stream = $null
  try {
    $Stream = [IO.File]::OpenRead($Path)
    [BitConverter]::ToString($Sha256.ComputeHash($Stream)).Replace('-', '')
  }
  finally {
    if ($Stream) { $Stream.Dispose() }
    $Sha256.Dispose()
  }
}

New-Item -ItemType Directory -Force -Path $CoreCache | Out-Null
$WorkDir = Join-Path $CoreCache ([IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $WorkDir | Out-Null
try {
  $Staging = Join-Path $WorkDir 'module'
  Copy-Item -LiteralPath "$PSScriptRoot\src" -Destination $Staging -Recurse
  New-Item -ItemType Directory -Force -Path "$Staging\bin" | Out-Null

  Write-Host "Packing AdGuardHome $Version..."
  foreach ($Arch in 'arm64', 'armv7') {
    $Asset = "AdGuardHome_linux_${Arch}.tar.gz"
    $Archive = Join-Path $CoreCache $Asset
    $Digest = $Lock[$Arch]
    if ($Digest -cnotmatch '^[a-f0-9]{64}$') {
      throw "Invalid SHA-256 for $Arch in adguardhome.lock"
    }

    if ((Test-Path -LiteralPath $Archive -PathType Leaf) -and (Get-ArchiveHash $Archive) -eq $Digest) {
      Write-Host "Using verified cache: $Archive"
    }
    else {
      $Download = Join-Path $WorkDir $Asset
      Write-Host "Downloading $ReleaseUrl/$Asset..."
      Invoke-WebRequest -UseBasicParsing -Uri "$ReleaseUrl/$Asset" -OutFile $Download
      if ((Get-ArchiveHash $Download) -ne $Digest) {
        throw "SHA-256 mismatch for $Asset"
      }
      Move-Item -LiteralPath $Download -Destination $Archive -Force
    }

    $ExtractDir = Join-Path $WorkDir $Arch
    New-Item -ItemType Directory -Path $ExtractDir | Out-Null
    # A relative archive path works with both Windows and GNU tar.
    Push-Location -LiteralPath $ExtractDir
    try {
      tar -xzf "../../$Asset"
      if ($LASTEXITCODE -ne 0) { throw "Extraction failed: $Archive" }
    }
    finally { Pop-Location }
    Copy-Item -LiteralPath "$ExtractDir\AdGuardHome\AdGuardHome" -Destination "$Staging\bin\AdGuardHome" -Force

    $Output = Join-Path $CacheDir "AdGuardHomeForRoot_${Arch}.zip"
    if (Test-Path -LiteralPath $Output) { Remove-Item -LiteralPath $Output }
    Push-Location -LiteralPath $Staging
    try {
      7z a -tzip $Output .
      if ($LASTEXITCODE -ne 0) { throw "Packaging failed: $Output" }
    }
    finally { Pop-Location }
    Write-Host "Packed: $Output"
  }
}
finally { Remove-Item -LiteralPath $WorkDir -Recurse -Force }

Write-Host 'Packing completed successfully.'
