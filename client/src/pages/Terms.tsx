import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Home, FileText, Shield, Lock, Eye, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsPage() {
  const sections = [
    { id: "privacy-policy", label: "Privacy Policy" },
    { id: "terms-of-service", label: "Terms of Service" },
    { id: "community-plan-validation", label: "Community Guidelines" },
  ];

  // Handle anchor navigation on page load and hash changes
  useEffect(() => {
    const handleAnchorNavigation = () => {
      const hash = window.location.hash;
      if (hash) {
        const element = document.querySelector(hash);
        if (element) {
          setTimeout(() => element.scrollIntoView({ behavior: "smooth" }), 100);
        }
      }
    };

    handleAnchorNavigation();
    window.addEventListener("hashchange", handleAnchorNavigation);
    return () => window.removeEventListener("hashchange", handleAnchorNavigation);
  }, []);

  return (
    <div className="h-screen overflow-auto bg-background text-foreground">
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

        {/* Navigation Tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              <Button variant="outline" size="sm" data-testid={`button-nav-${section.id}`}>
                {section.label}
              </Button>
            </a>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-8"
        >
          {/* ==================== PRIVACY POLICY SECTION ==================== */}
          <div id="privacy-policy">
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
          </div>

          {/* ==================== TERMS OF SERVICE SECTION ==================== */}
          <div id="terms-of-service" className="border-t-2 border-muted pt-12">
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
              </CardContent>
            </Card>

            {/* Community Plan Validation */}
            <Card id="community-plan-validation" className="border-3 border-blue-300 dark:border-blue-600 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">Community Plan Validation & Best Practices</h2>
                <p className="text-muted-foreground mb-4">
                  When using plans from the community or importing from social media and AI platforms, you must validate and apply critical thinking:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex gap-3">
                    <span className="text-blue-500 font-bold min-w-fit">•</span>
                    <span><strong>Use Common Sense:</strong> Validate plans based on the original social media reference and apply critical thinking to all content</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-500 font-bold min-w-fit">•</span>
                    <span><strong>Check the Source:</strong> For imported plans, verify the original social media, AI platform, or reference for accuracy and context</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-500 font-bold min-w-fit">•</span>
                    <span><strong>Adapt to Your Situation:</strong> Don't follow plans blindly—customize them based on your goals, capabilities, and circumstances</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-500 font-bold min-w-fit">•</span>
                    <span><strong>Remix Responsibly:</strong> When combining multiple plans, review and edit the merged result to ensure it makes sense for you</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-500 font-bold min-w-fit">•</span>
                    <span><strong>Consult Professionals:</strong> For specialized advice (medical, legal, financial), consult qualified professionals—don't rely solely on plans</span>
                  </li>
                </ul>
                <p className="text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 text-blue-900 dark:text-blue-200">
                  <strong>Important:</strong> JournalMate is not responsible for the accuracy, completeness, or legality of community plans. You are solely responsible for validating plans and making appropriate use of any plan you adopt or share.
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
                  If you have any questions about our policies, please contact us at <strong>support@journalmate.ai</strong>
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
