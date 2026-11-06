[CmdletBinding()]
param([string]$OutputDir)
. (Join-Path $PSScriptRoot 'Common.ps1')
if (-not $OutputDir) { $OutputDir = Join-Path $script:ProjectRoot 'dist' }
$null = [IO.Directory]::CreateDirectory($OutputDir)
$output = Join-Path $OutputDir 'typora-obsidian-callouts-0.1.4.zip'
$files = @('README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'scripts', 'styles', 'config', 'examples', 'vendor', 'patches', 'docs', 'tests') | ForEach-Object { Join-Path $script:ProjectRoot $_ }
Compress-Archive -LiteralPath $files -DestinationPath $output -Force
Write-Host ('Package: ' + $output)
Write-Host ('SHA256: ' + (Get-Sha256 $output))
