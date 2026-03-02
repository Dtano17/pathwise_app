$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"
Write-Host "Uninstalling existing app..."
adb uninstall ai.journalmate.app
Write-Host "Installing new debug APK..."
adb install "c:\Users\tanar\private\pathwise_app\android\app\build\outputs\apk\debug\app-debug.apk"
Write-Host "Launching app..."
adb shell am start -n ai.journalmate.app/ai.journalmate.app.MainActivity
