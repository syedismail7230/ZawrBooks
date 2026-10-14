# Zawr Books APK Compilation Pipeline
# Uses local Android SDK 34 and JDK 21

$ErrorActionPreference = "Stop"

$SdkPath = "C:\Users\syedi\AppData\Local\Android\Sdk"
$BuildToolsVersion = "34.0.0"
$BuildTools = "$SdkPath\build-tools\$BuildToolsVersion"
$AndroidJar = "$SdkPath\platforms\android-34\android.jar"
$JdkHome = "C:\Program Files\Java\jdk-21"
$env:JAVA_HOME = $JdkHome
$env:PATH = "$JdkHome\bin;$env:PATH"
$JdkBin = "$JdkHome\bin"

$ProjectRoot = Resolve-Path "."
$AppDir = "$ProjectRoot\android\app"
$SrcMain = "$AppDir\src\main"
$ResDir = "$SrcMain\res"
$Manifest = "$SrcMain\AndroidManifest.xml"
$JavaSrc = "$SrcMain\java\com\zawrindustries\zawrbooks\MainActivity.java"

$WorkDir = "$ProjectRoot\.apk_build"
$OutDir = "$ProjectRoot\apk"

if (Test-Path $WorkDir) { Remove-Item -Recurse -Force $WorkDir }
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
New-Item -ItemType Directory -Force -Path "$WorkDir\compiled_res" | Out-Null
New-Item -ItemType Directory -Force -Path "$WorkDir\gen" | Out-Null
New-Item -ItemType Directory -Force -Path "$WorkDir\classes" | Out-Null
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host ">>> [1/7] Compiling Android Resources with AAPT2..."
& "$BuildTools\aapt2.exe" compile --dir "$ResDir" -o "$WorkDir\compiled_res.zip"

Write-Host ">>> [2/7] Linking Resources & Manifest..."
& "$BuildTools\aapt2.exe" link -o "$WorkDir\unaligned.apk" `
    -I "$AndroidJar" `
    --manifest "$Manifest" `
    --min-sdk-version 24 `
    --target-sdk-version 34 `
    --java "$WorkDir\gen" `
    --auto-add-overlay `
    "$WorkDir\compiled_res.zip"

Write-Host ">>> [3/7] Compiling Java Sources with JDK 21..."
$RJava = (Get-ChildItem -Path "$WorkDir\gen" -Recurse -Filter "R.java").FullName
& "$JdkBin\javac.exe" -source 8 -target 8 -g -cp "$AndroidJar" -d "$WorkDir\classes" "$RJava" "$JavaSrc"

Write-Host ">>> [4/7] Generating classes.dex with D8..."
& "$BuildTools\d8.bat" --lib "$AndroidJar" --release --min-api 24 --output "$WorkDir" (Get-ChildItem -Path "$WorkDir\classes" -Recurse -Filter "*.class").FullName

Write-Host ">>> [5/7] Adding classes.dex to APK..."
# Use jar or tar or powershell Compress-Archive to add classes.dex into unaligned.apk
& "$JdkBin\jar.exe" -uf "$WorkDir\unaligned.apk" -C "$WorkDir" "classes.dex"

Write-Host ">>> [6/7] Aligning APK with zipalign..."
$FinalUnaligned = "$WorkDir\unaligned.apk"
$FinalAligned = "$WorkDir\aligned.apk"
& "$BuildTools\zipalign.exe" -f -p 4 "$FinalUnaligned" "$FinalAligned"

Write-Host ">>> [7/7] Signing APK with apksigner (v1, v2, v3)..."
$KeystorePath = "$WorkDir\zawr_release.keystore"
& "$JdkBin\keytool.exe" -genkeypair -v -keystore "$KeystorePath" -storepass zawrbooks2026 -keypass zawrbooks2026 -alias zawrbooks -dname "CN=Zawr Books, OU=Technology, O=Zawr Industries LLP, L=Bangalore, ST=Karnataka, C=IN" -validity 10000 -keyalg RSA -keysize 2048

$FinalApk = "$OutDir\ZawrBooks.apk"
if (Test-Path $FinalApk) { Remove-Item -Force $FinalApk }

& "$BuildTools\apksigner.bat" sign --ks "$KeystorePath" --ks-pass "pass:zawrbooks2026" --key-pass "pass:zawrbooks2026" --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out "$FinalApk" "$FinalAligned"

Write-Host ">>> Verification:"
& "$BuildTools\apksigner.bat" verify "$FinalApk"

$ApkInfo = Get-Item "$FinalApk"
Copy-Item -Path "$FinalApk" -Destination "$ProjectRoot\public\ZawrBooks.apk" -Force
Write-Host ">>> Copied APK to public/ZawrBooks.apk for direct web & mobile download"
Write-Host "=========================================="
Write-Host "SUCCESS! Android APK Generated:"
Write-Host "Path: $($ApkInfo.FullName)"
Write-Host "Size: $([math]::Round($ApkInfo.Length / 1024, 2)) KB"
Write-Host "=========================================="
