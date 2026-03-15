$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$publicPath = Join-Path $appRoot "public"
$processIdFile = Join-Path $appRoot ".server.pid"
$stdoutLog = Join-Path $appRoot ".server.stdout.log"
$stderrLog = Join-Path $appRoot ".server.stderr.log"

if (Test-Path $processIdFile) {
  $existingPid = Get-Content $processIdFile | Select-Object -First 1
  if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
    Write-Host "Server appears to be running. Stop it first."
    exit 1
  }

  Remove-Item $processIdFile -Force
}

# Resolve the actual Python executable so we do not track a short-lived launcher process.
$pythonExe = py -c "import sys; print(sys.executable)" 2>$null
if (-not $pythonExe) {
  Write-Host "Python was not found. Install Python or ensure the py launcher is available."
  exit 1
}

if (Test-Path $stdoutLog) { Remove-Item $stdoutLog -Force }
if (Test-Path $stderrLog) { Remove-Item $stderrLog -Force }

$argumentString = "-m http.server 5500 --directory `"$publicPath`""
$process = Start-Process -FilePath $pythonExe.Trim() -ArgumentList $argumentString -PassThru -WorkingDirectory $appRoot -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog
Start-Sleep -Milliseconds 500

if ($process.HasExited) {
  Write-Host "Server failed to start."
  if (Test-Path $stderrLog) {
    $errorText = Get-Content $stderrLog | Select-Object -First 10
    if ($errorText) {
      Write-Host "Error output:"
      $errorText | ForEach-Object { Write-Host $_ }
    }
  }
  exit 1
}

$process.Id | Out-File -FilePath $processIdFile -Encoding ascii

Write-Host "Server started on http://localhost:5500 (PID $($process.Id))"