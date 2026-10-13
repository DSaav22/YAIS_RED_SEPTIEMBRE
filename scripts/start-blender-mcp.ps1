param(
    [switch]$NoWindow
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$blenderPath = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'

if (-not (Test-Path -LiteralPath $blenderPath)) {
    throw "No se encontró Blender 5.2 en: $blenderPath"
}

$portOpen = Test-NetConnection -ComputerName 127.0.0.1 -Port 9876 -InformationLevel Quiet
if ($portOpen) {
    Write-Output 'Blender MCP ya está escuchando en 127.0.0.1:9876.'
    exit 0
}

$startArgs = @('--background', '--online-mode', '--command', 'blender_mcp')
$windowStyle = if ($NoWindow) { 'Hidden' } else { 'Normal' }
$process = Start-Process `
    -FilePath $blenderPath `
    -ArgumentList $startArgs `
    -WorkingDirectory $projectRoot `
    -WindowStyle $windowStyle `
    -PassThru

Start-Sleep -Seconds 5
$portOpen = Test-NetConnection -ComputerName 127.0.0.1 -Port 9876 -InformationLevel Quiet
if (-not $portOpen) {
    throw "Blender se inició (PID $($process.Id)), pero el puerto MCP 9876 no respondió."
}

Write-Output "Blender MCP activo en 127.0.0.1:9876 (PID $($process.Id))."
