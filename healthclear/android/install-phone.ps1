param([string]$Serial='', [string]$SdkPath='D:/android', [switch]$Development)
$ErrorActionPreference='Stop'
$adb=Join-Path $SdkPath 'platform-tools/adb.exe'
if (-not $Serial) {
 $devices=@(& $adb devices | Select-String '^([^\s]+)\s+device$' | ForEach-Object { $_.Matches[0].Groups[1].Value })
 $phones=@($devices | Where-Object { $_ -notlike 'emulator-*' })
 if ($phones.Count -eq 1) { $Serial=$phones[0] }
 elseif ($phones.Count -eq 0 -and $devices.Count -eq 1) { $Serial=$devices[0] }
 else { throw 'Connect and authorize one phone, or pass -Serial when multiple physical devices are connected. Enable USB debugging and accept the phone authorization prompt.' }
}
$apk=Join-Path (Split-Path $PSScriptRoot) $(if($Development){'releases/HealthClear-dev.apk'}else{'releases/HealthClear-1.5.1.apk'})
& $adb -s $Serial install --no-incremental -r $apk
if ($LASTEXITCODE -ne 0) { throw 'Installation failed. Keep the exact Android error above; do not uninstall or erase data automatically.' }
if ($Development) { & $adb -s $Serial reverse tcp:8080 tcp:8080; if ($LASTEXITCODE -ne 0) { throw 'Could not set up the USB backend connection.' } }
$launchOutput=@(& $adb -s $Serial shell am start -W -n com.healthclear.app/.MainActivity)
$launchCode=$LASTEXITCODE
$launchOutput | Write-Output
if ($launchCode -ne 0 -or ($launchOutput -join "`n") -match '(?im)^Status:\s*timeout\s*$|^Error:|^Exception') { throw 'APK installed, but Android did not confirm launch. Unlock your phone and open HealthClear manually; keep the launch message above if it fails.' }
