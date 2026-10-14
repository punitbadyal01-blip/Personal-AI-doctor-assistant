param(
 [string]$SdkPath = $env:ANDROID_HOME,
 [string]$JavaPath = $env:JAVA_HOME
)
$ErrorActionPreference = 'Stop'
if (-not $SdkPath) { if (Test-Path 'D:/android/platforms/android-36/android.jar') { $SdkPath='D:/android' } else { throw 'Set ANDROID_HOME or pass -SdkPath with an Android SDK containing platform 36 and build-tools 36.1.0.' } }
if (-not $JavaPath) { $JavaPath = Split-Path (Split-Path (Get-Command javac.exe).Source) }
$androidRoot = $PSScriptRoot
$projectRoot = Split-Path $androidRoot
$buildRoot = Join-Path $androidRoot 'build-direct'
$toolRoot = Join-Path $SdkPath 'build-tools/36.1.0'
$platformJar = Join-Path $SdkPath 'platforms/android-36/android.jar'
New-Item -ItemType Directory -Force -Path $buildRoot,(Join-Path $buildRoot 'classes'),(Join-Path $buildRoot 'dex'),(Join-Path $projectRoot 'releases') | Out-Null
function Run-Checked { param([string]$Executable,[string[]]$Arguments) & $Executable @Arguments; if ($LASTEXITCODE -ne 0) { throw "Build step failed: $Executable ($LASTEXITCODE)" } }
Run-Checked (Join-Path $toolRoot 'aapt2.exe') @('compile','--dir',(Join-Path $androidRoot 'app/src/main/res'),'-o',(Join-Path $buildRoot 'resources.zip'))
$manifest = [IO.File]::ReadAllText((Join-Path $androidRoot 'app/src/main/AndroidManifest.xml')).Replace('<manifest ', '<manifest package="com.healthclear.app" ')
[IO.File]::WriteAllText((Join-Path $buildRoot 'AndroidManifest.xml'),$manifest)
Run-Checked (Join-Path $toolRoot 'aapt2.exe') @('link','-o',(Join-Path $buildRoot 'unsigned.apk'),'--manifest',(Join-Path $buildRoot 'AndroidManifest.xml'),'-I',$platformJar,'-A',(Join-Path $projectRoot 'dist'),'--min-sdk-version','26','--target-sdk-version','36','--version-code','1','--version-name','1.0-demo',(Join-Path $buildRoot 'resources.zip'))
$sources = @(Get-ChildItem (Join-Path $androidRoot 'app/src/main/java') -Filter '*.java' -Recurse | ForEach-Object FullName)
Run-Checked (Join-Path $JavaPath 'bin/javac.exe') (@('-encoding','UTF-8','--release','17','-classpath',$platformJar,'-d',(Join-Path $buildRoot 'classes')) + $sources)
Run-Checked (Join-Path $JavaPath 'bin/jar.exe') @('cf',(Join-Path $buildRoot 'classes.jar'),'-C',(Join-Path $buildRoot 'classes'),'.')
Run-Checked (Join-Path $JavaPath 'bin/java.exe') @('-cp',(Join-Path $toolRoot 'lib/d8.jar'),'com.android.tools.r8.D8','--min-api','26','--lib',$platformJar,'--output',(Join-Path $buildRoot 'dex'),(Join-Path $buildRoot 'classes.jar'))
Run-Checked (Join-Path $JavaPath 'bin/jar.exe') @('uf',(Join-Path $buildRoot 'unsigned.apk'),'-C',(Join-Path $buildRoot 'dex'),'classes.dex')
Run-Checked (Join-Path $toolRoot 'zipalign.exe') @('-f','4',(Join-Path $buildRoot 'unsigned.apk'),(Join-Path $buildRoot 'aligned.apk'))
$key = Join-Path $buildRoot 'demo.keystore'
if (-not (Test-Path $key)) { Run-Checked (Join-Path $JavaPath 'bin/keytool.exe') @('-genkeypair','-keystore',$key,'-storepass','android','-keypass','android','-alias','androiddebugkey','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=HealthClear Demo,O=Development,C=IN') }
$apk = Join-Path $projectRoot 'releases/HealthClear-demo.apk'
Run-Checked (Join-Path $JavaPath 'bin/java.exe') @('-jar',(Join-Path $toolRoot 'lib/apksigner.jar'),'sign','--ks',$key,'--ks-pass','pass:android','--key-pass','pass:android','--out',$apk,(Join-Path $buildRoot 'aligned.apk'))
Run-Checked (Join-Path $JavaPath 'bin/java.exe') @('-jar',(Join-Path $toolRoot 'lib/apksigner.jar'),'verify','--verbose',$apk)
Write-Output "APK: $apk"
