$ErrorActionPreference = 'Continue'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = Join-Path $projectRoot '.tools\node-v22.23.2-win-x64\node.exe'
$npxPath = Join-Path $projectRoot '.tools\node-v22.23.2-win-x64\npx.cmd'
$blenderMcpPath = Join-Path $projectRoot '.tools\blender_mcp_venv\Scripts\blender-mcp.exe'
$blenderPath = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'

Write-Output "Project: $projectRoot"
Write-Output "Blender: $(Test-Path -LiteralPath $blenderPath)"
if (Test-Path -LiteralPath $blenderPath) { & $blenderPath --version | Select-Object -First 1 }
Write-Output "Node portable: $(Test-Path -LiteralPath $nodePath)"
if (Test-Path -LiteralPath $nodePath) { & $nodePath --version }
Write-Output "npx portable: $(Test-Path -LiteralPath $npxPath)"
Write-Output "Blender MCP CLI: $(Test-Path -LiteralPath $blenderMcpPath)"
if (Test-Path -LiteralPath $blenderMcpPath) { & $blenderMcpPath --help | Select-Object -First 3 }
Write-Output "Blender MCP socket 9876: $(Test-NetConnection -ComputerName 127.0.0.1 -Port 9876 -InformationLevel Quiet)"
Write-Output ''
codex mcp get blender
codex mcp get playcanvas
