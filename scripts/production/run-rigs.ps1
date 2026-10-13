param([ValidateSet('all','mascot','child_explorer','child_wheelchair','educator','community_guide')][string]$Character='all', [switch]$Render)
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$blender='C:/Program Files/Blender Foundation/Blender 5.2/blender.exe'
$script=Join-Path $PSScriptRoot 'rig-characters.py'
$ids=if($Character -eq 'all'){@('child_explorer','child_wheelchair','educator','community_guide','mascot')}else{@($Character)}
Push-Location $repo
try {
  foreach($id in $ids){
    $dest=Join-Path $repo "assets/production/animated/v001/$id"
    if(!(Test-Path "$dest/asset.json")){
      if((Test-Path "$dest/$id.blend") -or (Test-Path "$dest/$id.glb")){throw "Salida parcial $id; revisar antes de reconstruir."}
      & $blender -b -t 2 --python-exit-code 1 --python $script -- build $id
      if($LASTEXITCODE -ne 0){throw "Build falló: $id"}
    }
    & $blender -b -t 2 --python-exit-code 1 --python $script -- verify $id
    if($LASTEXITCODE -ne 0){throw "Verificación falló: $id"}
    if($Render){
      foreach($clip in @('Wave',$(if($id -eq 'child_wheelchair'){'Roll'}else{'Walk'}))){
        if(!(Test-Path "$dest/$clip-0.50.png")){
          & $blender -b -t 2 --python-exit-code 1 --python $script -- render $id $clip 0.5
          if($LASTEXITCODE -ne 0){throw "Render falló: $id $clip"}
        }
      }
    }
  }
} finally { Pop-Location }
