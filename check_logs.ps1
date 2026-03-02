$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"
adb logcat -d -t 50 | Select-String "NotificationPlugin|NativeNotifications|NotificationAlarm"
