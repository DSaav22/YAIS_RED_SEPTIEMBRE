param(
    [ValidateSet('build','front','three-quarter','side','back','verify')][string]$Action = 'build',
    [ValidateSet('v001','v002','v003','v004','v005')][string]$Version = 'v001'
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$blender = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
$script = Join-Path $PSScriptRoot 'mascot.py'
if ($Version -ne 'v001') { $script = Join-Path $PSScriptRoot 'mascot-v002.py' }
if ($Version -eq 'v005') { $script = Join-Path $PSScriptRoot 'mascot-v005.py' }
$extra = @()
if ($Version -eq 'v003') { $extra += '--refine' }
if ($Version -eq 'v004') { $extra += '--surface-final' }
& $blender --background --factory-startup --threads 2 --python-exit-code 1 --python $script -- $Action @extra
if ($LASTEXITCODE -ne 0) { throw "La etapa $Action falló ($LASTEXITCODE). Los archivos ya guardados se conservan." }
