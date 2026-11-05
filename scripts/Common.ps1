Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:ProjectRoot = Split-Path -Parent $PSScriptRoot
$script:Utf8 = [Text.UTF8Encoding]::new($false)
$script:NewLine = [Environment]::NewLine
$script:Loader = '<script src="./plugin/index.js" defer="defer"></script>'

function Write-Utf8([string]$Path, [string]$Content) {
    $null = [IO.Directory]::CreateDirectory((Split-Path -Parent $Path))
    [IO.File]::WriteAllText($Path, $Content, $script:Utf8)
}

function Read-Text([string]$Path) {
    if (Test-Path -LiteralPath $Path) { return [IO.File]::ReadAllText($Path) }
    return ''
}

function Get-Sha256([string]$Path) {
    $hasher = [Security.Cryptography.SHA256]::Create()
    $stream = [IO.File]::OpenRead($Path)
    try { return ([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $stream.Dispose(); $hasher.Dispose() }
}

function Resolve-Resources([string]$TyporaPath) {
    if ($TyporaPath) {
        $candidates = @($TyporaPath, (Join-Path $TyporaPath 'resources'), (Join-Path $TyporaPath 'resources\app'))
    } else {
        $candidates = @()
        foreach ($parent in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA)) {
            if ($parent) { $candidates += Join-Path $parent 'Typora\resources' }
        }
    }
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath (Join-Path $candidate 'window.html')) {
            return [IO.Path]::GetFullPath($candidate)
        }
    }
    throw 'Typora window.html not found. Supply -TyporaPath with the installation or resources directory.'
}

function Get-TableMatch([string]$Text, [string]$Section) {
    $pattern = '(?ms)^\[' + [regex]::Escape($Section) + '\][ \t]*\r?\n(?<body>.*?)(?=^\[|\z)'
    return [regex]::Match($Text, $pattern)
}

function Get-TomlBoolean([string]$Text, [string]$Section, [string]$Key) {
    $table = Get-TableMatch $Text $Section
    if (-not $table.Success) { return $null }
    $value = [regex]::Match($table.Groups['body'].Value, '(?m)^' + [regex]::Escape($Key) + '[ \t]*=[ \t]*(true|false)\b')
    if ($value.Success) { return $value.Groups[1].Value }
    return $null
}

function Set-TomlBoolean([string]$Text, [string]$Section, [string]$Key, [AllowNull()][string]$Value) {
    $table = Get-TableMatch $Text $Section
    $keyPattern = '(?m)^' + [regex]::Escape($Key) + '[ \t]*=[^\r\n]*(?:\r?\n|$)'
    if ($table.Success) {
        $body = $table.Groups['body'].Value
        $body = [regex]::Replace($body, $keyPattern, '')
        if ($Value) { $body = $Key + ' = ' + $Value + $script:NewLine + $body }
        $newTable = '[' + $Section + ']' + $script:NewLine + $body
        return $Text.Substring(0, $table.Index) + $newTable + $Text.Substring($table.Index + $table.Length)
    }
    if ($Value) { return $Text.TrimEnd() + $script:NewLine + $script:NewLine + '[' + $Section + ']' + $script:NewLine + $Key + ' = ' + $Value + $script:NewLine }
    return $Text
}

function Remove-ManagedBlock([string]$Text) {
    return [regex]::Replace($Text, '(?s)/\* BEGIN TYPORA OBSIDIAN CALLOUTS \*/.*?/\* END TYPORA OBSIDIAN CALLOUTS \*/\r?\n?', '')
}

function Add-ManagedImport([string]$Text, [string]$Asset) {
    $rest = Remove-ManagedBlock $Text
    # CSS imports must appear before normal declarations.
    return '/* BEGIN TYPORA OBSIDIAN CALLOUTS */' + $script:NewLine + '@import url("./obsidian-callouts/' + $Asset + '");' + $script:NewLine + '/* END TYPORA OBSIDIAN CALLOUTS */' + $script:NewLine + $rest
}

function Backup-File([string]$Path, [string]$BackupDir, [string]$Name) {
    if (Test-Path -LiteralPath $Path) { Copy-Item -LiteralPath $Path -Destination (Join-Path $BackupDir $Name) }
}
