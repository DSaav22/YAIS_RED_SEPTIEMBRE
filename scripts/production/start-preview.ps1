param([int]$WaitSeconds = 3, [int]$Port = 0)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$node = Join-Path $repo '.tools/node-v22.23.2-win-x64/node.exe'
$server = Join-Path $repo 'scripts/production/preview-server.cjs'
$out = Join-Path $repo 'assets/production/preview-server.out.log'
$err = Join-Path $repo 'assets/production/preview-server.err.log'
$running = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object {
    $_.ExecutablePath -eq $node -and $_.CommandLine.Replace('\','/') -like '*scripts/production/preview-server.cjs*'
}
if ($running) {
    Write-Host 'El servidor de previsualización ya está ejecutándose.'
    Write-Host 'Revisa assets/production/preview-server.out.log para obtener la URL actual.'
    exit 0
}
Start-Process -FilePath $node -ArgumentList @('scripts/production/preview-server.cjs', "$Port") -WorkingDirectory $repo -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err
for ($i = 0; $i -lt $WaitSeconds * 10; $i++) {
    if (Test-Path $out) {
        $line = Get-Content $out -ErrorAction SilentlyContinue | Select-Object -Last 1
        if ($line -like 'YAIS_PREVIEW_URL=*') { Write-Host $line; exit 0 }
    }
    Start-Sleep -Milliseconds 100
}
throw 'El servidor no informó su URL. Revisa assets/production/preview-server.err.log.'
