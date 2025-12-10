import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Home, Newspaper, Users, Shield, FileText, Mail, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { SEO, PAGE_SEO } from "@/components/SEO";

export default function SupportPage() {
  const resources = [
    {
      icon: Newspaper,
      title: "Updates & Blog",
      description: "Latest news, feature releases, and JournalMate updates",
      link: "/updates",
      color: "text-blue-500"
    },
    {
      icon: Users,
      title: "Community Plans",
      description: "Discover plans from other users, remix them, and share your own",
      link: "/discover",
      color: "text-purple-500"
    },
    {
      icon: Shield,
      title: "Privacy Policy",
      description: "Learn how we protect your data, PII redaction features, and GDPR/CCPA compliance",
      link: "/terms#privacy-policy",
      color: "text-emerald-500"
    },
    {
      icon: FileText,
      title: "Terms & Community Guidelines",
      description: "Community guidelines, plan validation best practices, and user responsibilities",
      link: "/terms#terms-of-service",
      color: "text-rose-500"
    },
    {
      icon: Mail,
      title: "Contact Support",
      description: "Email us with questions, feedback, or feature requests",
      link: "mailto:support@journalmate.ai",
      color: "text-violet-500",
      external: true
    }
  ];

  return (
    <div className="h-screen overflow-auto bg-background text-foreground">
      <SEO {...PAGE_SEO.support} />
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
            <HelpCircle className="w-8 h-8 text-purple-500" />
            <h1 className="text-4xl font-bold">Help & Resources</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Find answers, learn about our policies, and connect with the community
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          {resources.map((resource, index) => {
            const Icon = resource.icon;
            const LinkComponent = resource.external ? 'a' : Link;
            
            return (
              <motion.div
                key={resource.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <LinkComponent href={resource.link} target={resource.external ? "_blank" : undefined} rel={resource.external ? "noopener noreferrer" : undefined}>
                  <Card className="h-full hover-elevate cursor-pointer" data-testid={`card-resource-${resource.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <CardContent className="pt-6">
                      <div className={`w-12 h-12 rounded-lg bg-opacity-10 flex items-center justify-center mb-4 ${resource.color}`}>
                        <Icon className={`w-6 h-6 ${resource.color}`} />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{resource.title}</h3>
                      <p className="text-muted-foreground text-sm">
                        {resource.description}
                      </p>
                    </CardContent>
                  </Card>
                </LinkComponent>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Quick Help */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Frequently Needed</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-1">How do I protect my sensitive information?</h3>
                  <p className="text-muted-foreground text-sm">
                    See our <a href="/terms#privacy-policy" className="underline text-purple-500">Privacy Policy</a> for details on PII/PHI redaction features and data protection.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">What are my responsibilities when sharing plans?</h3>
                  <p className="text-muted-foreground text-sm">
                    Check our <a href="/terms#terms-of-service" className="underline text-purple-500">Terms of Service</a> for community guidelines and plan validation best practices.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">How do I use community plans responsibly?</h3>
                  <p className="text-muted-foreground text-sm">
                    Visit the <a href="/terms#community-plan-validation" className="underline text-purple-500">Community Plan Validation section</a> for best practices on validating and adapting plans.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
