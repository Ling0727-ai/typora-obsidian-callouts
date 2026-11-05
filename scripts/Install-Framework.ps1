[CmdletBinding()]
param([string]$TyporaPath, [switch]$Repair)
. (Join-Path $PSScriptRoot 'Common.ps1')

$resources = Resolve-Resources $TyporaPath
$htmlPath = Join-Path $resources 'window.html'
$html = Read-Text $htmlPath
$plugin = Join-Path $resources 'plugin'
$entry = Join-Path $plugin 'index.js'
if ($html.Contains($script:Loader) -and (Test-Path -LiteralPath $entry)) {
    Write-Host 'Framework loader already installed.'
    return
}
if ($html.Contains($script:Loader)) { throw 'Loader exists but plugin/index.js is missing. Restore the plugin folder before continuing.' }
if ($Repair -and -not (Test-Path -LiteralPath $entry)) { throw 'Repair requires an existing plugin directory. Run Install.ps1 for a fresh installation.' }
if ((Test-Path -LiteralPath $plugin) -and -not (Test-Path -LiteralPath $entry)) { throw 'An unrecognized plugin directory exists. Inspect it before installing.' }

$frame = '<script src="./appsrc/window/frame.js" defer="defer"></script>'
if (-not $html.Contains($frame)) { $frame = '<script src="./app/window/frame.js" defer="defer"></script>' }
if (-not $html.Contains($frame)) { throw 'Unsupported Typora HTML layout; injection stopped.' }

# Probe write access before any change. Elevation applies only to program files.
$probe = Join-Path $resources ('.callout-write-probe-' + [guid]::NewGuid().ToString('N'))
try { [IO.File]::WriteAllText($probe, ''); [IO.File]::Delete($probe) }
catch [UnauthorizedAccessException] {
    $argsList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $PSCommandPath + '"'), '-TyporaPath', ('"' + $resources + '"'))
    if ($Repair) { $argsList += '-Repair' }
    $process = Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argsList -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw 'Administrator installation failed or was cancelled.' }
    return
}

$manifest = Read-Text (Join-Path $script:ProjectRoot 'vendor\manifest.json') | ConvertFrom-Json
$archive = Join-Path $script:ProjectRoot ('vendor\' + $manifest.asset)
if ((Get-Sha256 $archive) -ne $manifest.sha256) { throw 'Bundled framework SHA-256 mismatch.' }
$stage = Join-Path ([IO.Path]::GetTempPath()) ('typora-callouts-' + [guid]::NewGuid().ToString('N'))
$null = [IO.Directory]::CreateDirectory($stage)
try {
    if (-not (Test-Path -LiteralPath $entry)) {
        Expand-Archive -LiteralPath $archive -DestinationPath $stage
        $stagedPlugin = Join-Path $stage 'plugin'
        if (-not (Test-Path -LiteralPath (Join-Path $stagedPlugin 'index.js'))) { throw 'Invalid framework archive.' }
        Copy-Item -LiteralPath (Join-Path $script:ProjectRoot 'config\settings.user.toml') -Destination (Join-Path $stagedPlugin 'global\settings\settings.user.toml') -Force
        Copy-Item -LiteralPath $stagedPlugin -Destination $plugin -Recurse
    }
    $backup = $htmlPath + '.callouts-' + (Get-Date -Format 'yyyyMMddHHmmssfff') + '.bak'
    Copy-Item -LiteralPath $htmlPath -Destination $backup
    Write-Utf8 $htmlPath ($html.Replace($frame, $frame + $script:Loader))
    Write-Host ('Framework loader installed. Backup: ' + $backup)
} finally {
    # Only remove this invocation's unique staging directory.
    if ([IO.Path]::GetFullPath($stage).StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()), [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $stage -Recurse -Force
    }
}
