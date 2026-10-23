param([string]$SdkPath='D:/android',[string]$JavaPath='C:/Program Files/Java/jdk-24',[string]$Serial='emulator-5556',[switch]$Diagnostic,[switch]$UiOnly)
$ErrorActionPreference='Stop'
if ($Serial -notlike 'emulator-*') { throw 'These fictional-provider instrumentation checks are for an emulator only. Use the phone install task for a physical device.' }
$root=$PSScriptRoot
$build=Join-Path $root 'build-direct/tests'
New-Item -ItemType Directory -Force -Path $build,(Join-Path $build 'classes'),(Join-Path $build 'dex') | Out-Null
$tools=Join-Path $SdkPath 'build-tools/36.1.0'
$androidJar=Join-Path $SdkPath 'platforms/android-36/android.jar'
function Run([string]$exe,[string[]]$arguments){ & $exe @arguments; if($LASTEXITCODE -ne 0){throw "Test build failed: $exe"} }
Run (Join-Path $tools 'aapt2.exe') @('link','-o',"$build/test.apk",'--manifest',"$root/test-src/AndroidManifest.xml",'-I',$androidJar)
Run "$JavaPath/bin/javac.exe" @('-encoding','UTF-8','--release','17','-classpath',$androidJar,'-d',"$build/classes","$root/test-src/SmokeInstrumentation.java")
Run "$JavaPath/bin/jar.exe" @('cf',"$build/test.jar",'-C',"$build/classes",'.')
Run "$JavaPath/bin/java.exe" @('-cp',"$tools/lib/d8.jar",'com.android.tools.r8.D8','--min-api','26','--lib',$androidJar,'--output',"$build/dex","$build/test.jar")
Run "$JavaPath/bin/jar.exe" @('uf',"$build/test.apk",'-C',"$build/dex",'classes.dex')
Run "$tools/zipalign.exe" @('-f','4',"$build/test.apk","$build/aligned.apk")
Run "$JavaPath/bin/java.exe" @('-jar',"$tools/lib/apksigner.jar",'sign','--ks',"$root/build-direct/demo.keystore",'--ks-pass','pass:android','--key-pass','pass:android','--out',"$build/signed.apk","$build/aligned.apk")
Run "$SdkPath/platform-tools/adb.exe" @('-s',$Serial,'install','--no-incremental','-r',"$build/signed.apk")
if (-not $Diagnostic -and -not $UiOnly) { Run "$SdkPath/platform-tools/adb.exe" @('-s',$Serial,'reverse','tcp:8080','tcp:8091') }
$result = if ($UiOnly) { & "$SdkPath/platform-tools/adb.exe" -s $Serial shell am instrument -w -e uiOnly true com.healthclear.tests/com.healthclear.tests.SmokeInstrumentation } elseif ($Diagnostic) { & "$SdkPath/platform-tools/adb.exe" -s $Serial shell am instrument -w -e diagnostic true com.healthclear.tests/com.healthclear.tests.SmokeInstrumentation } else { & "$SdkPath/platform-tools/adb.exe" -s $Serial shell am instrument -w com.healthclear.tests/com.healthclear.tests.SmokeInstrumentation }
$result | Write-Output
if ($LASTEXITCODE -ne 0 -or ($result -join "`n") -match 'FAIL:' -or (-not $Diagnostic -and ($result -join "`n") -notmatch 'PASS: upload')) { throw 'Android instrumentation checks did not pass.' }
