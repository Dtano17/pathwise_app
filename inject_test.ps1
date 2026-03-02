$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Injecting Notification Test via ADB ===" -ForegroundColor Cyan
Write-Host ""

# Clear logs first
adb logcat -c

# The JavaScript to execute
$testScript = @"
(function() {
  console.log('[TEST] Starting notification test...');
  console.log('[TEST] Capacitor:', typeof window.Capacitor);
  console.log('[TEST] Plugins:', window.Capacitor && window.Capacitor.Plugins ? Object.keys(window.Capacitor.Plugins) : 'none');

  var plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativeNotifications;
  if (!plugin) {
    console.error('[TEST] NativeNotifications plugin NOT FOUND!');
    return;
  }

  console.log('[TEST] Plugin found, calling show()...');
  plugin.show({
    title: 'ADB Test',
    body: 'Notification from ADB injection!',
    id: 33333
  }).then(function(result) {
    console.log('[TEST] Result:', JSON.stringify(result));
  }).catch(function(err) {
    console.error('[TEST] Error:', err);
  });
})();
"@

# URL encode the script for chrome devtools protocol
$encodedScript = [System.Uri]::EscapeDataString($testScript)

Write-Host "Setting up Chrome DevTools Protocol..." -ForegroundColor Yellow

# Forward port
adb forward tcp:9222 localabstract:webview_devtools_remote_18037

Write-Host "Port forwarded." -ForegroundColor Green
Write-Host ""

# Get the WebSocket URL
Write-Host "Getting WebSocket endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:9222/json" -Method Get -TimeoutSec 5
    Write-Host "Found targets:" -ForegroundColor Green
    $response | ForEach-Object { Write-Host "  - $($_.title): $($_.webSocketDebuggerUrl)" }

    if ($response.Count -gt 0 -and $response[0].webSocketDebuggerUrl) {
        $wsUrl = $response[0].webSocketDebuggerUrl
        Write-Host ""
        Write-Host "WebSocket URL: $wsUrl" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To execute JavaScript, use Chrome DevTools:" -ForegroundColor Yellow
        Write-Host "1. Open Chrome and go to chrome://inspect" -ForegroundColor White
        Write-Host "2. Click 'inspect' on the JournalMate target" -ForegroundColor White
        Write-Host "3. In Console, paste:" -ForegroundColor White
        Write-Host ""
        Write-Host $testScript -ForegroundColor Cyan
    }
} catch {
    Write-Host "Failed to get WebSocket endpoint: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the app is running and try again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Now monitoring logs for test output..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

adb logcat -s chromium:V Capacitor:V NotificationPlugin:V
