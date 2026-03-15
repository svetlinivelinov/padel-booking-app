$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$processIdFile = Join-Path $appRoot ".server.pid"

if (-not (Test-Path $processIdFile)) {
  Write-Host "No PID file found. Server may not be running."
  exit 1
}

$processId = Get-Content $processIdFile | Select-Object -First 1
if (-not $processId) {
  Write-Host "PID file is empty."
  Remove-Item $processIdFile -Force
  exit 1
}

try {
  Stop-Process -Id $processId -Force -ErrorAction Stop
  Write-Host "Server stopped (PID $processId)"
} catch {
  Write-Host "Failed to stop server PID $processId. It may already be stopped."
}

Remove-Item $processIdFile -Force