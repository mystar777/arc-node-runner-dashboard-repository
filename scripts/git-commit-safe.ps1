# Cursor 래핑을 피하는 안전 커밋 (plumbing)
# Usage: .\scripts\git-commit-safe.ps1 "commit message"
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Message
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location -LiteralPath $Root

$argsList = @($Message)
& node (Join-Path $Root 'scripts\git-commit-safe.mjs') @argsList
