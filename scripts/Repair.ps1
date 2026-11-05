[CmdletBinding()]
param([string]$TyporaPath)
& (Join-Path $PSScriptRoot 'Install-Framework.ps1') -TyporaPath $TyporaPath -Repair
