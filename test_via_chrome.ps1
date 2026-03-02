$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Test Notification via Chrome DevTools ===" -ForegroundColor Cyan
Write-Host ""

# First clear old logs and start fresh logcat
Write-Host "Clearing old logs..." -ForegroundColor Yellow
adb logcat -c

Write-Host ""
Write-Host "Step 1: Check for debuggable WebViews..." -ForegroundColor Yellow
$sockets = adb shell "cat /proc/net/unix 2>/dev/null" | Select-String "webview"
Write-Host $sockets

Write-Host ""
Write-Host "Step 2: Finding WebView debugging socket..." -ForegroundColor Yellow
$webviewSocket = adb shell "cat /proc/net/unix 2>/dev/null | grep -o 'webview_devtools_remote_[0-9]*' | head -1"
Write-Host "Found socket: $webviewSocket"

if ($webviewSocket) {
    Write-Host ""
    Write-Host "Step 3: Setting up port forwarding..." -ForegroundColor Yellow
    adb forward tcp:9222 localabstract:$webviewSocket
    Write-Host "Port forwarded to localhost:9222"

    Write-Host ""
    Write-Host "Step 4: Opening Chrome DevTools..." -ForegroundColor Green
    Write-Host "Open in browser: chrome://inspect" -ForegroundColor White
    Write-Host ""
    Write-Host "Then in the Console tab, run:" -ForegroundColor Cyan
    Write-Host @"

// Test immediate notification:
(async () => {
  const result = await window.Capacitor.Plugins.NativeNotifications.show({
    title: 'Test from DevTools',
    body: 'This notification was triggered via Chrome console!',
    id: 99999
  });
  console.log('Result:', result);
})();

// Test scheduled notification (10 seconds from now):
(async () => {
  const result = await window.Capacitor.Plugins.NativeNotifications.schedule({
    title: 'Scheduled Test',
    body: 'This was scheduled 10 seconds ago!',
    id: 99998,
    triggerAt: Date.now() + 10000
  });
  console.log('Schedule Result:', result);
})();

"@
} else {
    Write-Host "No WebView debugging socket found." -ForegroundColor Red
    Write-Host "Make sure the app is running and has a WebView loaded." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Monitoring logs for notification activity..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop"
Write-Host ""
adb logcat -s "NotificationPlugin:V" "NotificationAlarmReceiver:V" "Capacitor:V"
