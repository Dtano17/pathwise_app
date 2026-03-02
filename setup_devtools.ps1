$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Setting up Chrome DevTools ===" -ForegroundColor Cyan

# Clear logs for fresh monitoring
adb logcat -c
Write-Host "Logs cleared." -ForegroundColor Green

# Forward to the first webview
Write-Host "Setting up port forwarding..." -ForegroundColor Yellow
adb forward tcp:9222 localabstract:webview_devtools_remote_18037
Write-Host "Port forwarded: tcp:9222 -> webview_devtools_remote_18037" -ForegroundColor Green

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "INSTRUCTIONS:" -ForegroundColor White
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open Chrome browser on your PC" -ForegroundColor Yellow
Write-Host "2. Go to: chrome://inspect" -ForegroundColor Yellow
Write-Host "3. Look for 'JournalMate' under 'Remote Target'" -ForegroundColor Yellow
Write-Host "4. Click 'inspect' to open DevTools" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. In the Console tab, paste this to test IMMEDIATE notification:" -ForegroundColor Cyan
Write-Host ""
Write-Host @'
window.Capacitor.Plugins.NativeNotifications.show({
  title: 'Test Immediate',
  body: 'This should appear NOW!',
  id: 11111
}).then(r => console.log('Result:', r)).catch(e => console.error('Error:', e));
'@ -ForegroundColor White
Write-Host ""
Write-Host "6. To test SCHEDULED notification (10 seconds):" -ForegroundColor Cyan
Write-Host ""
Write-Host @'
window.Capacitor.Plugins.NativeNotifications.schedule({
  title: 'Scheduled Test',
  body: 'This was scheduled 10 seconds ago!',
  id: 22222,
  triggerAt: Date.now() + 10000
}).then(r => console.log('Schedule Result:', r)).catch(e => console.error('Error:', e));
'@ -ForegroundColor White
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
