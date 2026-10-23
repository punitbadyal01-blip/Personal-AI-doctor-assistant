param([string]$SdkPath='D:/android', [string]$Avd='HealthClear', [int]$Port=5556)
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot
$adb=Join-Path $SdkPath 'platform-tools/adb.exe'
$emulator=Join-Path $SdkPath 'emulator/emulator.exe'
if (-not (Test-Path $adb) -or -not (Test-Path $emulator)) { throw 'Set -SdkPath to your Android SDK with emulator and platform-tools installed.' }
$localAvd=Join-Path $project '.test-avd'
if (Test-Path (Join-Path $localAvd "$Avd.ini")) { $env:ANDROID_AVD_HOME=$localAvd }
$available=@(& $emulator -list-avds)
if ($available -notcontains $Avd) { throw "Create an Android virtual device named $Avd in Android Studio Device Manager, or pass -Avd with an existing name." }
$serial="emulator-$Port"
$devices=(& $adb devices) -join "`n"
if ($devices -notmatch [regex]::Escape($serial)) {
    $logs=Join-Path $project 'test-output/emulator'
    New-Item -ItemType Directory -Force -Path $logs | Out-Null
    # A visible emulator is intentional: the user is testing the Android app.
    $emulatorProcess=Start-Process -FilePath $emulator -PassThru -ArgumentList @('-avd',$Avd,'-port',"$Port",'-no-snapshot','-no-boot-anim','-gpu','swiftshader_indirect','-scale','0.6') -RedirectStandardOutput (Join-Path $logs 'emulator.log') -RedirectStandardError (Join-Path $logs 'emulator-error.log')
}
Write-Output 'Starting the Android emulator. A cold boot may take several minutes.'
$ready=$false
for ($attempt=0; $attempt -lt 120; $attempt++) {
    if ($emulatorProcess -and $emulatorProcess.HasExited) { throw 'The emulator closed before Android finished booting. Run this task again and leave its window open; check test-output/emulator logs if it closes unexpectedly.' }
    try { $boot=(& $adb -s $serial shell getprop sys.boot_completed 2>$null) -join '' } catch { $boot='' }
    if ($boot.Trim() -eq '1') { $ready=$true; break }
    if ($attempt % 5 -eq 0) { Write-Output 'Waiting for Android to finish booting...' }
    Start-Sleep -Seconds 3
}
if (-not $ready) { throw 'Android is still booting. Leave the emulator open and run this task again when its home screen appears.' }
& (Join-Path $project 'start-laptop.ps1') -NoBrowser
& (Join-Path $PSScriptRoot 'install-phone.ps1') -Serial $serial -SdkPath $SdkPath -Development
Write-Output 'HealthClear is open in the Android emulator. Start with a fictional sample, or connect the development backend for online features.'
if ($emulatorProcess) {
    Write-Output 'Leave this task running while testing. Close the emulator window when finished.'
    Wait-Process -Id $emulatorProcess.Id -ErrorAction SilentlyContinue
}
