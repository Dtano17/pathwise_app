$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Direct Notification Test ===" -ForegroundColor Cyan
Write-Host ""

# The best way to test is to use Chrome DevTools to run JS in the WebView
# First, let's enable WebView debugging and get the WebSocket URL

Write-Host "Checking for debuggable WebViews..." -ForegroundColor Yellow
$webviews = adb shell cat /proc/net/unix 2>$null | Select-String "webview_devtools"
Write-Host $webviews

Write-Host ""
Write-Host "Forwarding Chrome DevTools port..." -ForegroundColor Yellow
adb forward tcp:9222 localabstract:webview_devtools_remote_18037

Write-Host ""
Write-Host "You can now:" -ForegroundColor Green
Write-Host "1. Open Chrome and go to: chrome://inspect" -ForegroundColor White
Write-Host "2. Click 'inspect' on the JournalMate WebView" -ForegroundColor White
Write-Host "3. In the Console, run:" -ForegroundColor White
Write-Host ""
Write-Host "   // Test immediate notification:" -ForegroundColor Cyan
Write-Host "   window.Capacitor.Plugins.NativeNotifications.show({" -ForegroundColor Cyan
Write-Host "     title: 'Test from Console'," -ForegroundColor Cyan
Write-Host "     body: 'This notification was triggered manually!'," -ForegroundColor Cyan
Write-Host "     id: 12345" -ForegroundColor Cyan
Write-Host "   })" -ForegroundColor Cyan
Write-Host ""
Write-Host "   // Test scheduled notification (30 seconds from now):" -ForegroundColor Cyan
Write-Host "   window.Capacitor.Plugins.NativeNotifications.schedule({" -ForegroundColor Cyan
Write-Host "     title: 'Scheduled Test'," -ForegroundColor Cyan
Write-Host "     body: 'This was scheduled 30 seconds ago!'," -ForegroundColor Cyan
Write-Host "     id: 12346," -ForegroundColor Cyan
Write-Host "     triggerAt: Date.now() + 30000" -ForegroundColor Cyan
Write-Host "   })" -ForegroundColor Cyan
Write-Host ""

# Alternative: Try to use input to open browser console
Write-Host "Alternative: Checking all notification-related logs now..." -ForegroundColor Yellow
adb logcat -d -t 100 | Select-String -Pattern "Notification|notification" | Select-Object -Last 20
