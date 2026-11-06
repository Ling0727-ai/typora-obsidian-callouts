[CmdletBinding()]
param(
    [string]$TyporaPath,
    [string]$ThemeDir = (Join-Path $env:APPDATA 'Typora\themes'),
    [string]$UserConfigDir = (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.config\typora_plugin'),
    [string]$DarkTheme = 'night'
)
. (Join-Path $PSScriptRoot 'Common.ps1')
if ($DarkTheme -notmatch '^[a-zA-Z0-9_-]+$') { throw 'DarkTheme must be a theme filename without .css.' }
$resources = Resolve-Resources $TyporaPath
$stateDir = Join-Path $UserConfigDir 'obsidian-callouts'
$statePath = Join-Path $stateDir 'install-state.json'
$null = [IO.Directory]::CreateDirectory($stateDir)
$backupDir = Join-Path $stateDir ('backups\' + (Get-Date -Format 'yyyyMMddHHmmssfff'))
$null = [IO.Directory]::CreateDirectory($backupDir)
$settingsPath = Join-Path $UserConfigDir 'settings.user.toml'
$basePath = Join-Path $ThemeDir 'base.user.css'
$darkPath = Join-Path $ThemeDir ($DarkTheme + '.user.css')
if (Test-Path -LiteralPath $statePath) {
    $state = Read-Text $statePath | ConvertFrom-Json
    if ($state.ThemeDir -ne [IO.Path]::GetFullPath($ThemeDir) -or $state.DarkTheme -ne $DarkTheme) {
        throw 'Installation target changed. Uninstall the old style installation first.'
    }
} else {
    $state = [pscustomobject]@{
        Version = '0.1.2'; ThemeDir = [IO.Path]::GetFullPath($ThemeDir); DarkTheme = $DarkTheme
        SettingsExisted = (Test-Path -LiteralPath $settingsPath)
        OriginalGlobal = $null; OriginalCallouts = $null
        SettingsHash = ''; BackupDir = $backupDir
    }
}
Backup-File $basePath $backupDir 'base.user.css'
Backup-File $darkPath $backupDir 'dark.user.css'
Backup-File $settingsPath $backupDir 'settings.user.toml'

# Existing framework settings provide the starting point when home settings are absent.
$settings = Read-Text $settingsPath
if (-not (Test-Path -LiteralPath $settingsPath)) {
    $origin = Join-Path $resources 'plugin\global\settings\settings.user.toml'
    if (Test-Path -LiteralPath $origin) { $settings = Read-Text $origin }
    else { $settings = Read-Text (Join-Path $script:ProjectRoot 'config\settings.user.toml') }
}
if (-not (Test-Path -LiteralPath $statePath)) {
    $state.OriginalGlobal = Get-TomlBoolean $settings 'global' 'ENABLE'
    $state.OriginalCallouts = Get-TomlBoolean $settings 'callouts' 'ENABLE'
}
$settings = Set-TomlBoolean $settings 'global' 'ENABLE' 'true'
$settings = Set-TomlBoolean $settings 'callouts' 'ENABLE' 'true'

# Obtain program-file access before changing user files; leave the active document alone.
& (Join-Path $PSScriptRoot 'Install-Framework.ps1') -TyporaPath $resources
if (-not (Read-Text (Join-Path $resources 'window.html')).Contains($script:Loader)) { throw 'Framework installation did not complete.' }

$assetDir = Join-Path $ThemeDir 'obsidian-callouts'
$null = [IO.Directory]::CreateDirectory($assetDir)
foreach ($asset in @('callouts.css', 'callouts-dark.css')) {
    Copy-Item -LiteralPath (Join-Path $script:ProjectRoot ('styles\' + $asset)) -Destination (Join-Path $assetDir $asset) -Force
}
$base = Read-Text $basePath
# Migrate only the explicitly marked block from this project's early setup.
# Its original content was backed up above.
$base = [regex]::Replace($base, '(?s)/\* BEGIN OBSIDIAN CALLOUTS \*/.*?/\* END OBSIDIAN CALLOUTS \*/\r?\n?', '')
Write-Utf8 $basePath (Add-ManagedImport $base 'callouts.css')
Write-Utf8 $darkPath (Add-ManagedImport (Read-Text $darkPath) 'callouts-dark.css')
Write-Utf8 $settingsPath $settings
$state.SettingsHash = Get-Sha256 $settingsPath
$state.Version = '0.1.2'
Write-Utf8 $statePath ($state | ConvertTo-Json -Depth 4)
Write-Host 'Installed. Save your work and restart Typora. Callouts now use global styles.'
Write-Host ('Settings: ' + $settingsPath)
Write-Host ('Backup: ' + $backupDir)
