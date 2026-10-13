$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$blenderPath = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
$scriptPath = Join-Path $projectRoot 'scripts\blender-headless-blockout.py'

if (-not (Test-Path -LiteralPath $blenderPath)) { throw "No se encontró Blender: $blenderPath" }
& $blenderPath --background --factory-startup --python $scriptPath
if ($LASTEXITCODE -ne 0) { throw "Blender headless terminó con código $LASTEXITCODE" }

$blend = Join-Path $projectRoot 'assets\generated\isla-acuerdos-blockout.blend'
$glb = Join-Path $projectRoot 'assets\generated\isla-acuerdos-blockout.glb'
Write-Output "BLEND_OK=$(Test-Path -LiteralPath $blend)"
Write-Output "GLB_OK=$(Test-Path -LiteralPath $glb)"
