import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Home, FileText, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex gap-2 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-home">
              <Home className="w-4 h-4" />
              Home
            </Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-purple-500" />
            <h1 className="text-4xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Last Updated: November 2025
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-8"
        >
          {/* Agreement */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2>
              <p className="text-muted-foreground mb-4">
                By accessing and using JournalMate ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </CardContent>
          </Card>

          {/* User Content Responsibility */}
          <Card className="border-2 border-rose-200 dark:border-rose-900">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-rose-500" />
                Your Responsibility for Content
              </h2>
              <p className="text-muted-foreground mb-4">
                <strong>You are solely responsible for the content you create, import, and share through JournalMate.</strong>
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex gap-3">
                  <span className="text-rose-500 font-bold min-w-fit">•</span>
                  <span>You are responsible for what you post, upload, and share on the platform</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-rose-500 font-bold min-w-fit">•</span>
                  <span>You must not share content that violates anyone's privacy, intellectual property, or legal rights</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-rose-500 font-bold min-w-fit">•</span>
                  <span>You must not share sensitive information (passwords, social security numbers, medical records) without proper redaction</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-rose-500 font-bold min-w-fit">•</span>
                  <span>Before sharing publicly, YOU should review your content and use our privacy/redaction tools</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-rose-500 font-bold min-w-fit">•</span>
                  <span>You assume all risks associated with sharing information online</span>
                </li>
              </ul>
              <p className="text-sm bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded p-3 text-rose-900 dark:text-rose-200">
                JournalMate provides tools and features to help protect your information, but we are not responsible for any consequences resulting from your decision to share content publicly or with others.
              </p>
            </CardContent>
          </Card>

          {/* Acceptable Use */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Acceptable Use</h2>
              <p className="text-muted-foreground mb-4">You agree not to use JournalMate to:</p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Harass, abuse, or threaten others</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Share content that is illegal, obscene, or defamatory</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Violate anyone's intellectual property rights</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Engage in phishing, spam, or malicious activities</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Attempt to gain unauthorized access to the service</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Use automated tools to scrape or reproduce content</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Community Guidelines */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Community Guidelines</h2>
              <p className="text-muted-foreground mb-4">
                When sharing plans with the community or using community plans, follow these guidelines:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">✓</span>
                  <span><strong>You can use community plans:</strong> Browse, copy, remix, and use community plans as inspiration for your own goals</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">✓</span>
                  <span><strong>You can share your plans:</strong> Make your plans public so others can discover and use them</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">✓</span>
                  <span><strong>You can remix plans:</strong> Combine multiple community plans into one personalized plan</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">✓</span>
                  <span><strong>Attribution:</strong> When remixing, original creators are credited and attributed</span>
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                However, you must use common sense and validate any plan based on the original social media reference and your own judgment. JournalMate is not responsible for the accuracy, completeness, or legality of community plans.
              </p>
            </CardContent>
          </Card>

          {/* Plan Validation */}
          <Card className="border-2 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-blue-500" />
                Plan Validation & Common Sense
              </h2>
              <p className="text-muted-foreground mb-4">
                <strong>Important:</strong> When using plans from the community or importing from social media and AI platforms, YOU are responsible for:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-blue-500 font-bold min-w-fit">•</span>
                  <span>Validating that plans are accurate and relevant to your goals</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-500 font-bold min-w-fit">•</span>
                  <span>Checking the original social media source or AI platform reference for context</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-500 font-bold min-w-fit">•</span>
                  <span>Applying common sense logic and critical thinking to all plans</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-500 font-bold min-w-fit">•</span>
                  <span>Not blindly following plans without adapting them to your situation</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-500 font-bold min-w-fit">•</span>
                  <span>Consulting professionals (doctors, lawyers, financial advisors) for specialized advice</span>
                </li>
              </ul>
              <p className="text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 text-blue-900 dark:text-blue-200 mt-4">
                JournalMate provides AI-powered plan extraction, but the accuracy and suitability of any plan depends on the source material and your own judgment. Always apply critical thinking.
              </p>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Intellectual Property</h2>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Your Content:</strong> You retain all rights to plans and content you create. By sharing publicly, you grant JournalMate a license to display and allow community members to access your content</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Third-Party Content:</strong> You are responsible for ensuring you have rights to any third-party content you share (e.g., social media posts, AI outputs)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>JournalMate IP:</strong> All JournalMate code, design, and features are our intellectual property</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Disclaimers */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Disclaimers</h2>
              <p className="text-muted-foreground mb-4">
                <strong>JournalMate is provided "as is" without warranties:</strong>
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>We do not guarantee the accuracy of AI-generated plans or extracted tasks</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>We are not responsible for the content in community plans</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>We are not responsible for any outcomes from using plans or following advice</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>JournalMate is not a substitute for professional medical, legal, or financial advice</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground">
                To the fullest extent permitted by law, JournalMate and its owners are not liable for any indirect, incidental, special, or consequential damages resulting from your use of the service or reliance on any content provided.
              </p>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Termination</h2>
              <p className="text-muted-foreground mb-4">
                JournalMate may terminate your account if you:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Violate these terms of service</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Engage in illegal or harmful activities</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Repeatedly violate community guidelines</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may update these terms at any time. Continued use of JournalMate after changes constitutes your acceptance of the updated terms.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Questions?</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms of Service, please contact us at <strong>support@journalmate.ai</strong>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
