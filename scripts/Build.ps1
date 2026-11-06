[CmdletBinding()]
param([string]$OutputDir)
. (Join-Path $PSScriptRoot 'Common.ps1')
if (-not $OutputDir) { $OutputDir = Join-Path $script:ProjectRoot 'dist' }
$null = [IO.Directory]::CreateDirectory($OutputDir)
$output = Join-Path $OutputDir ('typora-obsidian-callouts-' + $script:PackageVersion + '-windows.zip')
$files = @('README.md', 'VERSION', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'install.cmd', 'install.sh', 'Install.command', 'scripts', 'styles', 'config', 'examples', 'vendor', 'patches', 'docs', 'tests') | ForEach-Object { Join-Path $script:ProjectRoot $_ }
Compress-Archive -LiteralPath $files -DestinationPath $output -Force
$hash = Get-Sha256 $output
Write-Utf8 ($output + '.sha256') ($hash + '  ' + [IO.Path]::GetFileName($output) + $script:NewLine)
Write-Host ('Package: ' + $output)
Write-Host ('SHA256: ' + $hash)
