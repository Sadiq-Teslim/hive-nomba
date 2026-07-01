# Keep the Outray tunnel alive. If it drops, this restarts it automatically.
# The fixed subdomain means the public URL is ALWAYS https://hive-ace.outray.app
# so the webhook URL you give Nomba never changes — even after a restart.
#
# Usage (from repo root):  pwsh ./scripts/tunnel.ps1   (or)  powershell ./scripts/tunnel.ps1

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

while ($true) {
  Write-Host "[tunnel] starting Outray -> https://hive-ace.outray.app (Ctrl+C to stop)..."
  outray start --config outray.toml
  Write-Host "[tunnel] Outray exited. Restarting in 3s..." -ForegroundColor Yellow
  Start-Sleep -Seconds 3
}
