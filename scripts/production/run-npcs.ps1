param(
  [ValidateSet('all','child_explorer','child_wheelchair','educator','community_guide')]
  [string]$Character = 'all'
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$blenderExe = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe'
$scriptPath = Join-Path $PSScriptRoot 'npc-kit.py'
$outputRoot = Join-Path $projectRoot 'assets/production/npc/v001'
$characters = @('child_explorer','child_wheelchair','educator','community_guide')
if ($Character -ne 'all') { $characters = @($Character) }
function Invoke-NpcStep([string]$NpcId, [string]$Step, [string[]]$Arguments) {
  $npcDir = Join-Path $outputRoot $NpcId
  New-Item -ItemType Directory -Path $npcDir -Force | Out-Null
  Write-Output "NPC $NpcId : $Step"
  if ($npcVersion -eq 'v002') { $Arguments += '--refine' }
  & $blenderExe -b -t 2 --python-exit-code 1 --python $scriptPath -- @Arguments *> (Join-Path $npcDir "$Step.log")
  if ($LASTEXITCODE -ne 0) { throw "Failed $NpcId / $Step. See its log." }
}
foreach ($npcId in $characters) {
  $npcVersion = if ($npcId -eq 'child_explorer') { 'v001' } else { 'v002' }
  $outputRoot = Join-Path $projectRoot "assets/production/npc/$npcVersion"
  $npcDir = Join-Path $outputRoot $npcId
  if (!(Test-Path (Join-Path $npcDir 'asset.json'))) {
    Invoke-NpcStep $npcId 'build' @('build',$npcId)
  }
  if (!(Test-Path (Join-Path $npcDir 'verification.json'))) {
    Invoke-NpcStep $npcId 'verify' @('verify',$npcId)
  }
  foreach ($view in @('three-quarter','front','side','back')) {
    if (!(Test-Path (Join-Path $npcDir "$view.png"))) {
      Invoke-NpcStep $npcId $view @('render',$npcId,$view)
    }
  }
  Write-Output "NPC $npcId : completed"
}
if ($Character -eq 'all') {
  & $blenderExe -b -t 2 --python-exit-code 1 --python $scriptPath -- manifest *> (Join-Path $outputRoot 'manifest.log')
  if ($LASTEXITCODE -ne 0) { throw 'Manifest failed. See manifest.log.' }
  $lineupPath = Join-Path $projectRoot 'assets/production/npc/v001/lineup.png'
  if (!(Test-Path $lineupPath)) {
    Write-Output 'NPC lineup : render'
    & $blenderExe -b -t 2 --python-exit-code 1 --python $scriptPath -- lineup *> (Join-Path $outputRoot 'lineup.log')
    if ($LASTEXITCODE -ne 0) { throw 'Lineup failed. See lineup.log.' }
  }
}
