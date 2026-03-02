$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"
Write-Host "Filtering notification logs from device..."
adb logcat -s NotificationPlugin:V NotificationAlarmReceiver:V BootReceiver:V
