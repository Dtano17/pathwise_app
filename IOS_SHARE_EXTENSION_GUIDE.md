# iOS Share Extension Implementation Guide

## Overview
This guide explains how to implement iOS Share Extension for JournalMate, allowing users to share content from other apps (Safari, Photos, Notes, etc.) directly into the journal.

## What is a Share Extension?
A Share Extension is a separate iOS app extension that appears in the system share sheet. When users tap "Share" in another app and select JournalMate, the extension captures the shared content and passes it to the main app.

## Architecture

```
┌──────────────┐
│  Other App   │ (Safari, Photos, etc.)
│              │
│  [Share] →   │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  iOS Share Sheet     │
│                      │
│  [JournalMate] →     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ JournalMate Share    │  ← Share Extension (separate target)
│ Extension            │
│                      │
│ 1. Capture data      │
│ 2. Save to App Group │
│ 3. Open main app     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ JournalMate Main App │
│                      │
│ 1. Read from shared  │
│ 2. Create journal    │
│ 3. Navigate to entry │
└──────────────────────┘
```

## Implementation Steps

### Step 1: Create Share Extension in Xcode

1. Open Xcode project: `ios/App/App.xcworkspace`
2. File → New → Target
3. Select "Share Extension" template
4. Name it "JournalMateShareExtension"
5. Language: Swift
6. Click "Finish"

### Step 2: Configure App Groups

App Groups allow data sharing between the main app and extension:

1. Select the **main app target** (App)
2. Go to "Signing & Capabilities"
3. Click "+" → "App Groups"
4. Add group: `group.com.journalmate.app`

5. Select the **Share Extension target** (JournalMateShareExtension)
6. Go to "Signing & Capabilities"
7. Click "+" → "App Groups"
8. Add the same group: `group.com.journalmate.app`

### Step 3: Implement Share Extension

**File: `ios/App/JournalMateShareExtension/ShareViewController.swift`**

Replace the generated code with:

```swift
import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {
    
    // App Group identifier for sharing data
    let appGroupId = "group.com.journalmate.app"
    
    override func isContentValid() -> Bool {
        // Validate that we have content to share
        return true
    }
    
    override func didSelectPost() {
        // Get shared content
        if let content = extensionContext?.inputItems.first as? NSExtensionItem {
            processSharedContent(content)
        }
    }
    
    private func processSharedContent(_ content: NSExtensionItem) {
        let attachments = content.attachments ?? []
        var shareData: [String: Any] = [:]
        
        // Process all attachments
        let group = DispatchGroup()
        
        for attachment in attachments {
            // Handle Text
            if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { (data, error) in
                    if let text = data as? String {
                        shareData["type"] = "text"
                        shareData["text"] = text
                        shareData["title"] = content.attributedContentText?.string ?? ""
                    }
                    group.leave()
                }
            }
            
            // Handle URL
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { (data, error) in
                    if let url = data as? URL {
                        shareData["type"] = "url"
                        shareData["url"] = url.absoluteString
                        shareData["title"] = content.attributedContentText?.string ?? ""
                    }
                    group.leave()
                }
            }
            
            // Handle Images
            if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                group.enter()
                attachment.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { (data, error) in
                    if let imageURL = data as? URL {
                        // Save image to shared container
                        if let sharedContainer = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: self.appGroupId) {
                            let timestamp = Int(Date().timeIntervalSince1970)
                            let fileName = "shared_image_\\(timestamp).jpg"
                            let targetURL = sharedContainer.appendingPathComponent(fileName)
                            
                            do {
                                if let imageData = try? Data(contentsOf: imageURL) {
                                    try imageData.write(to: targetURL)
                                    shareData["type"] = "file"
                                    shareData["files"] = [targetURL.path]
                                }
                            } catch {
                                print("Error saving image: \\(error)")
                            }
                        }
                    }
                    group.leave()
                }
            }
        }
        
        // When all attachments are processed
        group.notify(queue: .main) {
            self.saveShareDataAndOpenApp(shareData)
        }
    }
    
    private func saveShareDataAndOpenApp(_ shareData: [String: Any]) {
        // Save to shared UserDefaults
        if let sharedDefaults = UserDefaults(suiteName: appGroupId) {
            sharedDefaults.set(shareData, forKey: "pendingShare")
            sharedDefaults.set(Date().timeIntervalSince1970, forKey: "pendingShareTimestamp")
            sharedDefaults.synchronize()
        }
        
        // Open main app with custom URL scheme
        let url = URL(string: "journalmate://share/incoming")!
        
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(url, options: [:], completionHandler: { _ in
                    self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
                })
                return
            }
            responder = responder?.next
        }
        
        // Fallback: complete the request
        self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
    
    override func configurationItems() -> [Any]! {
        // Customize share sheet UI if needed
        return []
    }
}
```

### Step 4: Configure Share Extension Info.plist

**File: `ios/App/JournalMateShareExtension/Info.plist`**

Update the NSExtension configuration:

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionAttributes</key>
    <dict>
        <key>NSExtensionActivationRule</key>
        <dict>
            <!-- Accept text -->
            <key>NSExtensionActivationSupportsText</key>
            <true/>
            <!-- Accept URLs -->
            <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
            <integer>1</integer>
            <!-- Accept images -->
            <key>NSExtensionActivationSupportsImageWithMaxCount</key>
            <integer>5</integer>
        </dict>
    </dict>
    <key>NSExtensionMainStoryboard</key>
    <string>MainInterface</string>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.share-services</string>
</dict>
```

### Step 5: Handle Incoming Shares in Main App

Update your main app to read shared data when launched via URL scheme.

**File: `client/src/App.tsx`**

```typescript
import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { onIncomingShare } from '@/lib/shareSheet';

export default function App() {
  useEffect(() => {
    // Listen for URL open events (from Share Extension)
    CapApp.addListener('appUrlOpen', async (event) => {
      if (event.url.includes('share/incoming')) {
        // Read from shared UserDefaults
        const shareData = await getSharedData();
        
        if (shareData) {
          // Navigate to journal with pre-filled content
          window.location.href = `/journal/new?shared=${encodeURIComponent(JSON.stringify(shareData))}`;
        }
      }
    });

    // Also check for pending shares on app launch
    checkPendingShares();
  }, []);

  return <YourApp />;
}

async function getSharedData(): Promise<any> {
  // For iOS, we need a Capacitor plugin to read from App Group UserDefaults
  // This is a simplified version - you'll need a native plugin
  
  // On Android, you can use Capacitor Preferences
  const { value } = await Preferences.get({ key: 'pendingShare' });
  
  if (value) {
    const data = JSON.parse(value);
    
    // Clear the pending share
    await Preferences.remove({ key: 'pendingShare' });
    
    return data;
  }
  
  return null;
}

async function checkPendingShares() {
  const shareData = await getSharedData();
  
  if (shareData) {
    // Show modal or navigate to journal entry
    console.log('Pending share data:', shareData);
  }
}
```

### Step 6: Create Native Plugin for App Group Access

Since Capacitor doesn't provide direct access to App Group UserDefaults, create a simple plugin:

**File: `ios/App/App/Plugins/AppGroupPlugin.swift`**

```swift
import Foundation
import Capacitor

@objc(AppGroupPlugin)
public class AppGroupPlugin: CAPPlugin {
    let appGroupId = "group.com.journalmate.app"
    
    @objc func getSharedData(_ call: CAPPluginCall) {
        if let sharedDefaults = UserDefaults(suiteName: appGroupId) {
            if let shareData = sharedDefaults.dictionary(forKey: "pendingShare") {
                // Clear the data
                sharedDefaults.removeObject(forKey: "pendingShare")
                sharedDefaults.removeObject(forKey: "pendingShareTimestamp")
                sharedDefaults.synchronize()
                
                call.resolve([
                    "data": shareData
                ])
                return
            }
        }
        
        call.resolve(["data": nil])
    }
    
    @objc func clearSharedData(_ call: CAPPluginCall) {
        if let sharedDefaults = UserDefaults(suiteName: appGroupId) {
            sharedDefaults.removeObject(forKey: "pendingShare")
            sharedDefaults.synchronize()
        }
        call.resolve()
    }
}
```

**File: `ios/App/App/Plugins/AppGroupPlugin.m`**

```objective-c
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AppGroupPlugin, "AppGroupPlugin",
    CAP_PLUGIN_METHOD(getSharedData, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearSharedData, CAPPluginReturnPromise);
)
```

### Step 7: Update JavaScript Bridge

**File: `client/src/lib/appGroupBridge.ts`** (new file)

```typescript
import { registerPlugin } from '@capacitor/core';

interface AppGroupPlugin {
  getSharedData(): Promise<{ data: any }>;
  clearSharedData(): Promise<void>;
}

const AppGroup = registerPlugin<AppGroupPlugin>('AppGroupPlugin');

export async function getIOSSharedData(): Promise<any | null> {
  try {
    const result = await AppGroup.getSharedData();
    return result.data;
  } catch (error) {
    console.error('Failed to get shared data:', error);
    return null;
  }
}

export async function clearIOSSharedData(): Promise<void> {
  try {
    await AppGroup.clearSharedData();
  } catch (error) {
    console.error('Failed to clear shared data:', error);
  }
}
```

### Step 8: Update Share Sheet Library

**File: `client/src/lib/shareSheet.ts`**

Update `initIncomingShareListener()` to support iOS:

```typescript
import { getIOSSharedData } from './appGroupBridge';
import { isIOS } from './platform';

export function initIncomingShareListener(): void {
  if (!isNative()) {
    return;
  }

  if (isIOS()) {
    // Check for pending shares from Share Extension
    checkIOSPendingShare();
    
    // Listen for app URL opens
    App.addListener('appUrlOpen', (event) => {
      if (event.url.includes('share/incoming')) {
        checkIOSPendingShare();
      }
    });
  } else {
    // Android intent handling (existing code)
    if ((window as any).plugins?.intentShim) {
      // ... existing Android code ...
    }
  }
}

async function checkIOSPendingShare(): Promise<void> {
  const shareData = await getIOSSharedData();
  
  if (shareData) {
    setPendingShareData(shareData);
  }
}
```

## Testing

### iOS Simulator/Device

1. Build and run the app with the Share Extension
2. Open Safari and navigate to any webpage
3. Tap the Share button
4. Find "JournalMate" in the share options
5. Tap it and verify the content is captured
6. Verify the main app opens with the shared content

### Debugging

```swift
// Add logging to ShareViewController.swift
print("[SHARE EXT] Processing content: \\(shareData)")

// Check App Group in main app
if let sharedDefaults = UserDefaults(suiteName: "group.com.journalmate.app") {
    let data = sharedDefaults.dictionary(forKey: "pendingShare")
    print("[MAIN APP] Shared data: \\(data ?? [:])")
}
```

## Common Issues

### Share Extension Not Appearing
- Verify App Groups are configured correctly for both targets
- Check Info.plist has correct NSExtensionActivationRule
- Rebuild the project completely

### Data Not Transferring
- Confirm both targets use the same App Group ID
- Check UserDefaults synchronize() is called
- Verify URL scheme is registered in main app

### Images Not Loading
- Ensure images are saved to shared container
- Check file permissions in App Group
- Verify file paths are correct

## Production Considerations

1. **Memory Limits**: Share Extensions have ~120MB memory limit
2. **Processing Time**: Keep extension fast (<1 second ideal)
3. **File Management**: Clean up old shared images periodically
4. **Error Handling**: Show user-friendly error messages
5. **Privacy**: Request appropriate permissions for data access

## Next Steps

1. Create Share Extension target in Xcode
2. Configure App Groups for both targets
3. Implement ShareViewController.swift
4. Create AppGroupPlugin for data access
5. Update shareSheet.ts with iOS support
6. Test on physical device
7. Submit to App Store with extension enabled

## Resources

- [Apple Share Extension Documentation](https://developer.apple.com/documentation/uikit/share_and_action_extensions)
- [App Groups Guide](https://developer.apple.com/documentation/security/keychain_services/keychain_items/sharing_access_to_keychain_items_among_a_collection_of_apps)
- [Capacitor Plugin Development](https://capacitorjs.com/docs/plugins)
