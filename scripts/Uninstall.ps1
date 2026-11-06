[CmdletBinding()]
param([string]$UserConfigDir = (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.config\typora_plugin'))
. (Join-Path $PSScriptRoot 'Common.ps1')
$statePath = Join-Path $UserConfigDir 'obsidian-callouts\install-state.json'
if (-not (Test-Path -LiteralPath $statePath)) { throw 'No installation state found; no files were changed.' }
$state = Read-Text $statePath | ConvertFrom-Json
foreach ($name in @('base.user.css', ($state.DarkTheme + '.user.css'))) {
    $path = Join-Path $state.ThemeDir $name
    if (Test-Path -LiteralPath $path) { Write-Utf8 $path (Remove-ManagedBlock (Read-Text $path)) }
}
$settingsPath = Join-Path $UserConfigDir 'settings.user.toml'
if (Test-Path -LiteralPath $settingsPath) {
    if ((Get-Sha256 $settingsPath) -eq $state.SettingsHash) {
        if ($state.SettingsExisted) {
            $settings = Read-Text $settingsPath
            $settings = Set-TomlBoolean $settings 'global' 'ENABLE' $state.OriginalGlobal
            $settings = Set-TomlBoolean $settings 'callouts' 'ENABLE' $state.OriginalCallouts
            if ($state.PSObject.Properties['OriginalImages']) {
                $settings = Set-TomlBoolean $settings 'obsidian_images' 'ENABLE' $state.OriginalImages
            }
            Write-Utf8 $settingsPath $settings
        } else {
            Remove-Item -LiteralPath $settingsPath
        }
    } else { Write-Warning 'Plugin settings changed since installation; retained them. Disable callouts and obsidian_images manually if desired.' }
}
# Keep shared framework files and backups: they may now be used by other plugins.
# Styles become inactive when their managed imports are removed.
Remove-Item -LiteralPath $statePath
Write-Host 'Global Callout imports removed. Shared plugin framework, asset files and backups retained.'
Write-Host 'Save your work and restart Typora.'
