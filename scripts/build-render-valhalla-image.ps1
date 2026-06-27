param(
    [Parameter(Mandatory = $true)]
    [string]$ImageTag,

    [switch]$Push
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot "valhalla-data"
$dockerfileSource = Join-Path $repoRoot "deploy\\valhalla-image\\Dockerfile"
$entrypointSource = Join-Path $repoRoot "deploy\\valhalla-image\\seed-entrypoint.sh"
$tempContext = Join-Path $env:TEMP "streetsafe-valhalla-image"
$contextCustomFiles = Join-Path $tempContext "custom_files"
$contextDeployDir = Join-Path $tempContext "deploy\\valhalla-image"

$requiredFiles = @(
    "valhalla.json",
    "valhalla_tiles.tar",
    "admins.sqlite",
    "timezones.sqlite",
    "default_speeds.json",
    "file_hashes.txt"
)

if (-not (Test-Path $sourceDir)) {
    throw "Could not find valhalla-data at $sourceDir"
}

foreach ($file in $requiredFiles) {
    $fullPath = Join-Path $sourceDir $file
    if (-not (Test-Path $fullPath)) {
        throw "Missing required Valhalla asset: $fullPath"
    }
}

$pbfFiles = Get-ChildItem -LiteralPath $sourceDir -Filter *.osm.pbf -File
if ($pbfFiles.Count -ne 1) {
    throw "Expected exactly one .osm.pbf file in $sourceDir, found $($pbfFiles.Count)"
}

if (Test-Path $tempContext) {
    Remove-Item -LiteralPath $tempContext -Recurse -Force
}

New-Item -ItemType Directory -Path $contextCustomFiles -Force | Out-Null
New-Item -ItemType Directory -Path $contextDeployDir -Force | Out-Null

Copy-Item -LiteralPath $dockerfileSource -Destination (Join-Path $contextDeployDir "Dockerfile")
Copy-Item -LiteralPath $entrypointSource -Destination (Join-Path $contextDeployDir "seed-entrypoint.sh")

foreach ($file in $requiredFiles) {
    Copy-Item -LiteralPath (Join-Path $sourceDir $file) -Destination (Join-Path $contextCustomFiles $file)
}

Copy-Item -LiteralPath $pbfFiles[0].FullName -Destination (Join-Path $contextCustomFiles "united-kingdom-latest.osm.pbf")

Write-Host "Building $ImageTag from $tempContext"
docker build -f (Join-Path $contextDeployDir "Dockerfile") -t $ImageTag $tempContext
if ($LASTEXITCODE -ne 0) {
    throw "docker build failed with exit code $LASTEXITCODE"
}

if ($Push) {
    Write-Host "Pushing $ImageTag"
    docker push $ImageTag
    if ($LASTEXITCODE -ne 0) {
        throw "docker push failed with exit code $LASTEXITCODE"
    }
}
