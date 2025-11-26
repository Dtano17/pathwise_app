import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Home, Shield, Lock, Eye, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
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
            <Shield className="w-8 h-8 text-purple-500" />
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
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
          {/* Overview */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Eye className="w-6 h-6 text-blue-500" />
                Your Privacy Matters
              </h2>
              <p className="text-muted-foreground mb-4">
                JournalMate is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and protect your data.
              </p>
              <p className="text-muted-foreground">
                By using JournalMate, you agree to the practices described in this policy. If you do not agree with our practices, please do not use our service.
              </p>
            </CardContent>
          </Card>

          {/* Data Collection */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Account Information:</strong> Email, name, profile picture, and authentication credentials</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Plans & Tasks:</strong> All plans, tasks, activities, and journal entries you create</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Imported Content:</strong> When you import plans from social media, AI platforms, or other sources, we process that content to extract actionable tasks</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Usage Data:</strong> How you interact with the app (features used, tasks completed, etc.)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Device Information:</strong> Device type, operating system, and app version</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* PII/PHI Redaction Features */}
          <Card className="border-2 border-emerald-200 dark:border-emerald-900">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6 text-emerald-500" />
                Protecting Your Sensitive Information
              </h2>
              <p className="text-muted-foreground mb-4">
                JournalMate provides built-in redaction features to help protect Personally Identifiable Information (PII) and Protected Health Information (PHI). These features include:
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex gap-3">
                  <span className="text-emerald-500 font-bold min-w-fit">✓</span>
                  <span><strong>Automatic Redaction:</strong> Option to automatically mask sensitive data (phone numbers, email addresses, social security numbers, medical information)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-500 font-bold min-w-fit">✓</span>
                  <span><strong>Manual Redaction:</strong> Tools to manually select and redact specific text in plans and journal entries</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-500 font-bold min-w-fit">✓</span>
                  <span><strong>Privacy Shield:</strong> When sharing plans, option to redact sensitive information before public sharing</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-500 font-bold min-w-fit">✓</span>
                  <span><strong>Import Filtering:</strong> Review imported content and redact PII/PHI before saving</span>
                </li>
              </ul>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  <strong>Important:</strong> While JournalMate provides these redaction features, it is YOUR responsibility to use them. We recommend always reviewing your content before sharing and actively using our privacy tools when handling sensitive information.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Usage */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>To provide and improve JournalMate services</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>To personalize your experience and AI recommendations</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>To process payments and manage subscriptions</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>To send you notifications about your account or service updates</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>To communicate with you about features, promotions, or customer support</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>To analyze usage patterns and improve our AI algorithms</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>To comply with legal obligations</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Sharing */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">When We Share Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We do NOT sell your personal data. We may share information in these limited circumstances:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Service Providers:</strong> Third-party services (payment processors, AI providers, hosting) that need data to provide services</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Community Sharing:</strong> Only when you explicitly choose to share plans publicly with the community</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Legal Requirements:</strong> When required by law or to protect our rights</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* User Responsibility */}
          <Card className="border-2 border-rose-200 dark:border-rose-900">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-rose-500" />
                User Responsibility
              </h2>
              <p className="text-muted-foreground mb-4">
                <strong>You are responsible for:</strong>
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-rose-500 font-bold min-w-fit">•</span>
                  <span>Actively using our redaction features to protect your sensitive information</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-rose-500 font-bold min-w-fit">•</span>
                  <span>Reviewing content before sharing publicly or with others</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-rose-500 font-bold min-w-fit">•</span>
                  <span>Not sharing plans, activities, or journal entries that contain sensitive personal information</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-rose-500 font-bold min-w-fit">•</span>
                  <span>Maintaining the confidentiality of your account credentials</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-rose-500 font-bold min-w-fit">•</span>
                  <span>Using privacy settings appropriately for your needs</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Encryption in transit (HTTPS/TLS)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Secure password storage with hashing</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Regular security audits and updates</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span>Limited access to personal data (need-to-know basis)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your data as long as your account is active. If you delete your account, we will delete all associated data within 30 days, except where required by law. When you import content from social media or other sources, raw media files (images, videos) are deleted within 24 hours of processing.
              </p>
            </CardContent>
          </Card>

          {/* GDPR & CCPA */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">GDPR & CCPA Compliance</h2>
              <p className="text-muted-foreground mb-4">
                JournalMate complies with GDPR and CCPA regulations:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Right to Access:</strong> You can request all your personal data at any time</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Right to Delete:</strong> You can request deletion of your account and data</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Right to Correct:</strong> You can update inaccurate information</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-500 font-bold min-w-fit">•</span>
                  <span><strong>Right to Portability:</strong> You can export your data</span>
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Contact support@journalmate.ai to exercise any of these rights.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Questions?</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy or how we handle your data, please contact us at <strong>support@journalmate.ai</strong>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
