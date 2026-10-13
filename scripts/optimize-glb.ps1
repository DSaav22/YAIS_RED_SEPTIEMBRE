param(
    [Parameter(Mandatory = $true)] [string]$InputPath,
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$cli = Join-Path $projectRoot '.tools\gltf-tools\node_modules\.bin\gltf-transform.cmd'
if (-not (Test-Path -LiteralPath $cli)) { throw "No se encontró glTF Transform. Ejecuta el setup de herramientas primero." }

$inputFull = (Resolve-Path -LiteralPath $InputPath).Path
if (-not $OutputPath) {
    $inputItem = Get-Item -LiteralPath $inputFull
    $OutputPath = Join-Path $inputItem.DirectoryName ($inputItem.BaseName + '.optimized.glb')
}

& $cli optimize $inputFull $OutputPath --texture-compress webp
if ($LASTEXITCODE -ne 0) { throw "glTF Transform terminó con código $LASTEXITCODE" }
Write-Output "OPTIMIZED_GLB=$OutputPath"
