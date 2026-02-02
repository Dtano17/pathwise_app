import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Link2, Share2, Smartphone } from "lucide-react";

interface ImportMethodsProps {
  aiName: 'ChatGPT' | 'Claude' | 'Gemini' | 'Perplexity';
  shareUrlExample?: string;
  primaryColor?: string;
}

export function ImportMethods({ aiName, shareUrlExample, primaryColor = "blue" }: ImportMethodsProps) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
  };

  const bgClass = colorClasses[primaryColor as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div className="w-full">
      <h3 className="text-2xl font-bold mb-6 text-center">3 Ways to Import from {aiName}</h3>

      <Tabs defaultValue="copy-paste" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="copy-paste" className="gap-2">
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy & Paste</span>
            <span className="sm:hidden">Copy</span>
          </TabsTrigger>
          <TabsTrigger value="share-link" className="gap-2">
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share Link</span>
            <span className="sm:hidden">Link</span>
          </TabsTrigger>
          <TabsTrigger value="mobile" className="gap-2">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Mobile</span>
            <span className="sm:hidden">Mobile</span>
          </TabsTrigger>
        </TabsList>

        {/* Copy & Paste Method */}
        <TabsContent value="copy-paste" className="mt-6">
          <div className={`${bgClass} border-2 p-6 rounded-xl`}>
            <div className="flex items-start gap-3 mb-4">
              <Copy className="w-5 h-5 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-lg mb-2">Method 1: Copy & Paste</h4>
                <p className="text-sm opacity-90 mb-4">The quickest way to import your {aiName} conversation</p>
              </div>
            </div>

            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold">1.</span>
                <span>Go to your {aiName} conversation where you created your plan</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">2.</span>
                <span>Select and copy the entire conversation or just the plan text (Ctrl+A, Ctrl+C / Cmd+A, Cmd+C)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">3.</span>
                <span>Come to JournalMate → Go to <strong>Import Plan</strong> page</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">4.</span>
                <span>Paste the text (Ctrl+V / Cmd+V) and click <strong>Parse Plan</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">5.</span>
                <span>Review extracted tasks, edit if needed, and click <strong>Confirm Import</strong></span>
              </li>
            </ol>

            <div className="mt-4 p-3 bg-white/50 rounded border border-current/20">
              <p className="text-xs font-medium mb-1">💡 Pro Tip:</p>
              <p className="text-xs opacity-80">
                Copy the entire conversation for best results. Our AI will automatically extract only the actionable tasks and ignore the rest.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Share Link Method */}
        <TabsContent value="share-link" className="mt-6">
          <div className={`${bgClass} border-2 p-6 rounded-xl`}>
            <div className="flex items-start gap-3 mb-4">
              <Link2 className="w-5 h-5 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-lg mb-2">Method 2: Share Link</h4>
                <p className="text-sm opacity-90 mb-4">Import using a shareable URL from {aiName}</p>
              </div>
            </div>

            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold">1.</span>
                <span>In your {aiName} conversation, look for the <strong>Share</strong> button (usually top-right)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">2.</span>
                <span>Click <strong>Share</strong> → <strong>Copy Link</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">3.</span>
                <span>Go to JournalMate → <strong>Import Plan</strong> page</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">4.</span>
                <span>Paste the URL and click <strong>Parse Plan</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">5.</span>
                <span>JournalMate will fetch the conversation and extract tasks automatically</span>
              </li>
            </ol>

            {shareUrlExample && (
              <div className="mt-4 p-3 bg-white/50 rounded border border-current/20">
                <p className="text-xs font-medium mb-2">Example {aiName} URL:</p>
                <code className="text-xs bg-white px-2 py-1 rounded border border-current/20 break-all block">
                  {shareUrlExample}
                </code>
              </div>
            )}

            <div className="mt-4 p-3 bg-white/50 rounded border border-current/20">
              <p className="text-xs font-medium mb-1">💡 Pro Tip:</p>
              <p className="text-xs opacity-80">
                URL import preserves the full context and may work better for complex conversations with multiple plans.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Mobile Share Sheet Method */}
        <TabsContent value="mobile" className="mt-6">
          <div className={`${bgClass} border-2 p-6 rounded-xl`}>
            <div className="flex items-start gap-3 mb-4">
              <Share2 className="w-5 h-5 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-lg mb-2">Method 3: Mobile Share Sheet</h4>
                <p className="text-sm opacity-90 mb-4">Direct import from {aiName} mobile app (iOS & Android)</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* iOS */}
              <div>
                <p className="font-semibold mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  iOS (iPhone/iPad)
                </p>
                <ol className="space-y-3 text-sm ml-6">
                  <li className="flex gap-3">
                    <span className="font-bold">1.</span>
                    <span>Open {aiName} mobile app and create your plan</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold">2.</span>
                    <span>Tap the <strong>Share</strong> icon (square with arrow up)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold">3.</span>
                    <span>Scroll and select <strong>JournalMate</strong> from the share sheet</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold">4.</span>
                    <span>JournalMate app opens → Review and confirm import</span>
                  </li>
                </ol>
              </div>

              {/* Android */}
              <div>
                <p className="font-semibold mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Android
                </p>
                <ol className="space-y-3 text-sm ml-6">
                  <li className="flex gap-3">
                    <span className="font-bold">1.</span>
                    <span>Open {aiName} mobile app and create your plan</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold">2.</span>
                    <span>Tap the <strong>Share</strong> or <strong>⋮</strong> (three dots) menu</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold">3.</span>
                    <span>Select <strong>Share with...</strong> → Choose <strong>JournalMate</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold">4.</span>
                    <span>JournalMate app opens → Review and confirm import</span>
                  </li>
                </ol>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white/50 rounded border border-current/20">
              <p className="text-xs font-medium mb-1">💡 Pro Tip:</p>
              <p className="text-xs opacity-80">
                Make sure the JournalMate app is installed on your phone. The share sheet integration works seamlessly once installed.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
