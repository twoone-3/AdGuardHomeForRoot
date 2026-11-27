$ErrorActionPreference = "Stop"

# 定义下载 URL 和路径变量
$CacheDir = "$PSScriptRoot\cache"
$Lock = Get-Content -Raw -LiteralPath "$PSScriptRoot\adguardhome.lock" | ConvertFrom-StringData
$Version = $Lock.version
if ($Version -cnotmatch '^v[0-9]+\.[0-9]+\.[0-9]+$') {
  throw "Invalid AdGuardHome version in adguardhome.lock: $Version"
}
$CoreCache = "$CacheDir\$Version"
$ReleaseUrl = "https://github.com/AdguardTeam/AdGuardHome/releases/download/$Version"
$Archs = "arm64", "armv7"

function Get-ArchiveHash([string]$Path) {
  $Sha256 = [Security.Cryptography.SHA256]::Create()
  $Stream = $null
  try {
    $Stream = [IO.File]::OpenRead($Path)
    [BitConverter]::ToString($Sha256.ComputeHash($Stream)).Replace("-", "")
  }
  finally {
    if ($Stream) {
      $Stream.Dispose()
    }
    $Sha256.Dispose()
  }
}

# 创建缓存目录
if (-Not (Test-Path -LiteralPath $CoreCache)) {
  Write-Host "Creating cache directory..."
  New-Item -Path $CoreCache -ItemType Directory -Force | Out-Null
}
$WorkName = [IO.Path]::GetRandomFileName()
$WorkDir = "$CoreCache\$WorkName"
New-Item -Path $WorkDir -ItemType Directory | Out-Null
Push-Location -LiteralPath $CoreCache
try {
  # 下载文件，缓存校验通过时不再下载
  Write-Host "Downloading AdGuardHome $Version..."
  foreach ($Arch in $Archs) {
    $Asset = "AdGuardHome_linux_${Arch}.tar.gz"
    $url = "$ReleaseUrl/$Asset"
    $CachePath = "$CoreCache\$Asset"
    $Digest = $Lock[$Arch]
    if ($Digest -cnotmatch '^[a-f0-9]{64}$') {
      throw "Invalid SHA-256 for $Arch in adguardhome.lock"
    }

    if ((Test-Path -LiteralPath $CachePath -PathType Leaf) -and (Get-ArchiveHash $CachePath) -eq $Digest) {
      Write-Host "File already exists in cache, skipping download: $CachePath"
    }
    else {
      $Download = "$WorkDir\$Asset"
      Write-Host "Downloading $url..."
      Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $Download
      if ((Get-ArchiveHash $Download) -ne $Digest) {
        throw "SHA-256 mismatch for $Asset"
      }
      Move-Item -LiteralPath $Download -Destination $CachePath -Force
      Write-Host "Download completed successfully."
    }
  }

  # 使用 tar 解压文件
  Write-Host "Extracting AdGuardHome..."
  foreach ($Arch in $Archs) {
    $Asset = "AdGuardHome_linux_${Arch}.tar.gz"
    $ExtractDir = "$WorkDir\$Arch"
    New-Item -Path $ExtractDir -ItemType Directory | Out-Null
    Write-Host "Extracting $CoreCache\$Asset..."
    # 使用相对路径，兼容 Windows 和 GNU tar
    tar -xzf $Asset -C "$WorkName/$Arch"
    if ($LASTEXITCODE -ne 0) {
      throw "Extraction failed: $CoreCache\$Asset"
    }
    Write-Host "Extraction completed successfully."
  }

  # 设置项目根目录
  $ProjectRoot = "$PSScriptRoot\src"
  $env:PATH += ";C:\Program Files\7-Zip"
  $Staging = "$WorkDir\module"
  Copy-Item -LiteralPath $ProjectRoot -Destination $Staging -Recurse
  New-Item -Path "$Staging\bin" -ItemType Directory -Force | Out-Null

  # 给项目打包，使用 7-Zip 压缩 zip
  Write-Host "Packing AdGuardHome..."
  foreach ($Arch in $Archs) {
    $OutputPath = "$CacheDir\AdGuardHomeForRoot_${Arch}.zip"
    if (Test-Path -LiteralPath $OutputPath) {
      Remove-Item -LiteralPath $OutputPath
    }

    Copy-Item -LiteralPath "$WorkDir\$Arch\AdGuardHome\AdGuardHome" -Destination "$Staging\bin\AdGuardHome" -Force
    7z a -tzip $OutputPath "$Staging\*"
    if ($LASTEXITCODE -ne 0) {
      throw "Packaging failed: $OutputPath"
    }
    Write-Host "Packed: $OutputPath"
  }
}
finally {
  Pop-Location
  Remove-Item -LiteralPath $WorkDir -Recurse -Force
}

Write-Host "Packing completed successfully."
