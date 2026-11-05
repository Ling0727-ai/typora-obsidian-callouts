$ErrorActionPreference = 'Stop'
. (Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts\Common.ps1')
function Assert([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw ('FAILED: ' + $Message) }
    Write-Host ('PASS: ' + $Message)
}
$root = $script:ProjectRoot
foreach ($path in (Get-ChildItem -LiteralPath (Join-Path $root 'scripts') -Filter '*.ps1').FullName) {
    $tokens = $null; $parseErrors = $null
    $null = [Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$parseErrors)
    Assert ($parseErrors.Count -eq 0) ('PowerShell syntax: ' + [IO.Path]::GetFileName($path))
}
$manifest = Read-Text (Join-Path $root 'vendor\manifest.json') | ConvertFrom-Json
Assert ((Get-Sha256 (Join-Path $root ('vendor\' + $manifest.asset))) -eq $manifest.sha256) 'Pinned archive checksum'

$workspace = Join-Path $root ('.work\lifecycle-' + [guid]::NewGuid().ToString('N'))
$resources = Join-Path $workspace 'Typora\resources'
$themes = Join-Path $workspace 'themes'
$config = Join-Path $workspace 'config'
$frame = '<script src="./appsrc/window/frame.js" defer="defer"></script>'
Write-Utf8 (Join-Path $resources 'window.html') ('<!doctype html><html><body>' + $frame + '</body></html>')
Write-Utf8 (Join-Path $themes 'base.user.css') 'body { --keep-me: 1; }'
Write-Utf8 (Join-Path $themes 'night.user.css') 'body { --keep-dark: 1; }'
$settings = "[global]" + $script:NewLine + "ENABLE = false" + $script:NewLine + "[callouts]" + $script:NewLine + "ENABLE = false" + $script:NewLine + "[window_tab]" + $script:NewLine + "ENABLE = true" + $script:NewLine + 'CUSTOM = "retain"' + $script:NewLine
Write-Utf8 (Join-Path $config 'settings.user.toml') $settings
$installArgs = @{ TyporaPath = $resources; ThemeDir = $themes; UserConfigDir = $config }
& (Join-Path $root 'scripts\Install.ps1') @installArgs
Assert ((Read-Text (Join-Path $resources 'window.html')).Contains($script:Loader)) 'Fresh framework injection'
Assert (Test-Path -LiteralPath (Join-Path $resources 'plugin\callouts\index.js')) 'Archive deployed'
$current = Read-Text (Join-Path $config 'settings.user.toml')
Assert ((Get-TomlBoolean $current 'callouts' 'ENABLE') -eq 'true') 'Callouts enabled'
Assert ((Get-TomlBoolean $current 'window_tab' 'ENABLE') -eq 'true' -and $current.Contains('CUSTOM = "retain"')) 'Other settings preserved'
$base = Read-Text (Join-Path $themes 'base.user.css')
Assert ($base.StartsWith('/* BEGIN TYPORA OBSIDIAN CALLOUTS */') -and $base.Contains('--keep-me')) 'Import precedes preserved user styles'
& (Join-Path $root 'scripts\Install.ps1') @installArgs
$base = Read-Text (Join-Path $themes 'base.user.css')
Assert (([regex]::Matches($base, 'BEGIN TYPORA OBSIDIAN CALLOUTS')).Count -eq 1) 'Repeated installation is idempotent'
Assert (([regex]::Matches((Read-Text (Join-Path $resources 'window.html')), [regex]::Escape($script:Loader))).Count -eq 1) 'Single loader tag'
Write-Utf8 (Join-Path $themes 'base.user.css') ($base + $script:NewLine + 'p { --later-edit: 1; }')
& (Join-Path $root 'scripts\Uninstall.ps1') -UserConfigDir $config
$base = Read-Text (Join-Path $themes 'base.user.css')
Assert (-not $base.Contains('BEGIN TYPORA OBSIDIAN CALLOUTS') -and $base.Contains('--later-edit')) 'Uninstall preserves later CSS edits'
$current = Read-Text (Join-Path $config 'settings.user.toml')
Assert ((Get-TomlBoolean $current 'global' 'ENABLE') -eq 'false' -and (Get-TomlBoolean $current 'callouts' 'ENABLE') -eq 'false') 'Original switch values restored'

# Simulate a Typora update dropping the injected loader.
$htmlPath = Join-Path $resources 'window.html'
Write-Utf8 $htmlPath ((Read-Text $htmlPath).Replace($script:Loader, ''))
& (Join-Path $root 'scripts\Repair.ps1') -TyporaPath $resources
Assert ((Read-Text $htmlPath).Contains($script:Loader)) 'Repair after an app update'

# Changed plugin settings must survive uninstall.
& (Join-Path $root 'scripts\Install.ps1') @installArgs
$changed = (Read-Text (Join-Path $config 'settings.user.toml')) + $script:NewLine + '# User edit after installation'
Write-Utf8 (Join-Path $config 'settings.user.toml') $changed
& (Join-Path $root 'scripts\Uninstall.ps1') -UserConfigDir $config
Assert ((Read-Text (Join-Path $config 'settings.user.toml')) -eq $changed) 'User settings edits survive uninstall'

# No existing user settings: inherit the fresh preset and remove only the new home file on uninstall.
$freshConfig = Join-Path $workspace 'fresh-config'
$freshThemes = Join-Path $workspace 'fresh-themes'
& (Join-Path $root 'scripts\Install.ps1') -TyporaPath $resources -ThemeDir $freshThemes -UserConfigDir $freshConfig
$freshSettings = Read-Text (Join-Path $freshConfig 'settings.user.toml')
Assert ((Get-TomlBoolean $freshSettings 'callouts' 'ENABLE') -eq 'true' -and (Get-TomlBoolean $freshSettings 'window_tab' 'ENABLE') -eq 'false') 'Fresh preset enables only Callouts'
& (Join-Path $root 'scripts\Uninstall.ps1') -UserConfigDir $freshConfig
Assert (-not (Test-Path -LiteralPath (Join-Path $freshConfig 'settings.user.toml'))) 'Uninstall restores absence of user settings'

# A different resources layout must not be modified.
$unknown = Join-Path $workspace 'unsupported'
Write-Utf8 (Join-Path $unknown 'window.html') '<html>unknown layout</html>'
$rejected = $false
try { & (Join-Path $root 'scripts\Install-Framework.ps1') -TyporaPath $unknown } catch { $rejected = $true }
Assert $rejected 'Unknown layout rejected'
Assert ((Read-Text (Join-Path $unknown 'window.html')) -eq '<html>unknown layout</html>') 'Rejected layout left intact'
Write-Host ('Lifecycle checks completed in ' + $workspace)
