@echo off
REM Android Emulator Setup and Launch Script for JournalMate
REM This script helps you set up and launch the Android emulator

echo.
echo ================================================================
echo   JournalMate - Android Emulator Setup
echo ================================================================
echo.

REM Check if Android Studio is installed
echo [1/5] Checking for Android Studio...
where android-studio >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Android Studio found
) else (
    echo [!] Android Studio not found in PATH
    echo.
    echo Please install Android Studio from:
    echo https://developer.android.com/studio
    echo.
    echo After installation, add these to your PATH:
    echo - %LOCALAPPDATA%\Android\Sdk\platform-tools
    echo - %LOCALAPPDATA%\Android\Sdk\emulator
    echo.
    pause
    exit /b 1
)

REM Check if Android SDK is available
echo [2/5] Checking for Android SDK...
if exist "%LOCALAPPDATA%\Android\Sdk" (
    echo [OK] Android SDK found at %LOCALAPPDATA%\Android\Sdk
    set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
) else if exist "%ProgramFiles(x86)%\Android\android-sdk" (
    echo [OK] Android SDK found at %ProgramFiles(x86)%\Android\android-sdk
    set ANDROID_HOME=%ProgramFiles(x86)%\Android\android-sdk
) else (
    echo [!] Android SDK not found
    echo Please install Android SDK through Android Studio
    pause
    exit /b 1
)

REM Check if emulator tool exists
echo [3/5] Checking for Android Emulator...
if exist "%ANDROID_HOME%\emulator\emulator.exe" (
    echo [OK] Android Emulator found
) else (
    echo [!] Android Emulator not found
    echo Please install it through Android Studio SDK Manager
    pause
    exit /b 1
)

REM Check if adb is available
echo [4/5] Checking for ADB (Android Debug Bridge)...
where adb >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] ADB found
) else (
    echo [!] ADB not found in PATH
    echo Adding to PATH temporarily...
    set PATH=%PATH%;%ANDROID_HOME%\platform-tools
)

REM List available AVDs
echo [5/5] Checking for Android Virtual Devices...
echo.
"%ANDROID_HOME%\emulator\emulator.exe" -list-avds > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Available Android Virtual Devices:
    echo.
    "%ANDROID_HOME%\emulator\emulator.exe" -list-avds
    echo.
) else (
    echo [!] No Android Virtual Devices found
    echo.
    echo Please create one:
    echo 1. Open Android Studio
    echo 2. Tools ^> Device Manager
    echo 3. Click "Create Device"
    echo 4. Select Pixel 6 or Pixel 7
    echo 5. Select Android 13 (API 33) or higher
    echo 6. Click Finish
    echo.
    pause
    exit /b 1
)

echo ================================================================
echo   Setup Complete!
echo ================================================================
echo.
echo Next steps:
echo.
echo Option 1: Launch using Capacitor (Recommended)
echo   npm run build
echo   npx cap sync android
echo   npx cap open android
echo   [Then click Run in Android Studio]
echo.
echo Option 2: Use this script to launch emulator
echo   [Select an AVD name from the list above]
echo.
echo ================================================================
echo.

choice /C YN /M "Do you want to open Android Studio now"
if %ERRORLEVEL% EQU 1 (
    echo.
    echo Opening Android Studio...
    cd android
    start "" "%LOCALAPPDATA%\Programs\Android\Android Studio\bin\studio64.exe" .
    echo.
    echo Android Studio should open shortly.
    echo Once opened, click the Run button to launch your app.
) else (
    echo.
    echo You can manually open Android Studio later with:
    echo   npx cap open android
)

echo.
pause
