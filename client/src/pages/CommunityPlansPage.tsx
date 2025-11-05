import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Heart, Eye, Sparkles, Copy } from "lucide-react";

// Category configuration
const categories = [
  { value: "trending", label: "🔥 Trending", icon: "🔥" },
  { value: "travel", label: "✈️ Travel", icon: "✈️" },
  { value: "fitness", label: "💪 Fitness", icon: "💪" },
  { value: "productivity", label: "📊 Productivity", icon: "📊" },
  { value: "events", label: "🎉 Events", icon: "🎉" },
  { value: "career", label: "💼 Career", icon: "💼" },
  { value: "home", label: "🏡 Home", icon: "🏡" },
  { value: "learning", label: "📚 Learning", icon: "📚" },
];

// Sample plan templates with gradients
interface PlanTemplate {
  id: string;
  title: string;
  description: string;
  creator: { name: string; initials: string; color: string };
  category: string;
  likes: string;
  views: string;
  gradient: string;
  theme: string;
}

const planTemplates: PlanTemplate[] = [
  {
    id: "weekend-paris",
    title: "Weekend Trip to Paris",
    description: "Complete 3-day Paris itinerary with sights, dining, and Eiffel Tower visit",
    creator: { name: "Sarah Chen", initials: "SC", color: "bg-purple-500" },
    category: "Travel",
    likes: "2.4k",
    views: "12.5k",
    gradient: "from-purple-600 via-purple-500 to-indigo-600",
    theme: "purple"
  },
  {
    id: "30day-fitness",
    title: "30-Day Fitness Challenge",
    description: "Daily workouts, meal prep, and progress tracking for complete transformation",
    creator: { name: "Mike Johnson", initials: "MJ", color: "bg-green-500" },
    category: "Fitness",
    likes: "1.8k",
    views: "9.2k",
    gradient: "from-emerald-600 via-green-500 to-teal-600",
    theme: "green"
  },
  {
    id: "wedding-planning",
    title: "Wedding Planning Checklist",
    description: "12-month wedding plan with venue, vendors, guests, and timeline",
    creator: { name: "Emma Davis", initials: "ED", color: "bg-rose-500" },
    category: "Events",
    likes: "3.2k",
    views: "15.8k",
    gradient: "from-rose-600 via-pink-500 to-orange-500",
    theme: "coral"
  },
  {
    id: "career-tech",
    title: "Career Switch to Tech",
    description: "6-month plan: coding bootcamp, portfolio projects, and job applications",
    creator: { name: "Alex Kim", initials: "AK", color: "bg-indigo-500" },
    category: "Career",
    likes: "1.5k",
    views: "7.3k",
    gradient: "from-indigo-600 via-purple-500 to-violet-600",
    theme: "purple"
  },
  {
    id: "home-renovation",
    title: "Home Renovation Project",
    description: "Complete kitchen remodel timeline with contractor coordination and budget",
    creator: { name: "John Smith", initials: "JS", color: "bg-red-500" },
    category: "Home",
    likes: "2.1k",
    views: "10.4k",
    gradient: "from-red-600 via-rose-500 to-pink-600",
    theme: "coral"
  },
  {
    id: "spanish-90days",
    title: "Learn Spanish in 90 Days",
    description: "Daily practice schedule, vocabulary building, and conversation practice",
    creator: { name: "Lisa Garcia", initials: "LG", color: "bg-amber-500" },
    category: "Learning",
    likes: "1.2k",
    views: "6.1k",
    gradient: "from-amber-600 via-orange-500 to-yellow-600",
    theme: "orange"
  },
];

export default function CommunityPlansPage() {
  const [selectedCategory, setSelectedCategory] = useState("trending");
  const { toast } = useToast();

  // Fetch user's groups
  const { data: groups = [] } = useQuery<any[]>({
    queryKey: ["/api/groups"],
  });

  // Create group activity mutation
  const createGroupActivityMutation = useMutation({
    mutationFn: async ({ template, groupId }: { template: PlanTemplate; groupId: string }) => {
      const response = await apiRequest("POST", "/api/group-activities", {
        groupId,
        title: template.title,
        description: template.description,
        category: template.category.toLowerCase(),
        theme: template.theme,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        isCompleted: false
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Group activity created!",
        description: `"${variables.template.title}" has been added to your group`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/group-activities"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create activity",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleUsePlan = (template: PlanTemplate) => {
    // If user has groups, use the first one; otherwise show error
    if (groups.length === 0) {
      toast({
        title: "No groups found",
        description: "Please join or create a group first",
        variant: "destructive",
      });
      return;
    }

    // Use the first group (in production, could show a selector)
    const firstGroup = groups[0];
    createGroupActivityMutation.mutate({ template, groupId: firstGroup.id });
  };

  // Filter templates by category
  const filteredTemplates = selectedCategory === "trending" 
    ? planTemplates 
    : planTemplates.filter(t => t.category.toLowerCase() === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3" data-testid="text-page-title">
            Discover & Use Community Plans
          </h1>
          <p className="text-lg text-muted-foreground mb-2" data-testid="text-page-description">
            Browse plans created by others, get inspired, and use them for your own goals.
          </p>
          <p className="text-sm text-muted-foreground">
            Join thousands planning together!
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <div className="flex justify-center">
            <TabsList className="flex-wrap h-auto gap-1 p-1" data-testid="tabs-categories">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.value}
                  value={cat.value}
                  className="gap-1"
                  data-testid={`tab-${cat.value}`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="hidden sm:inline">{cat.label.split(' ')[1]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((plan) => (
            <Card
              key={plan.id}
              className="overflow-hidden border-0 shadow-lg hover-elevate transition-all"
              data-testid={`card-plan-${plan.id}`}
            >
              {/* Gradient Header */}
              <div className={`relative h-48 bg-gradient-to-br ${plan.gradient} p-6 flex flex-col justify-between`}>
                {/* Like Count Badge */}
                <div className="flex justify-end">
                  <Badge
                    variant="secondary"
                    className="bg-white/90 backdrop-blur-sm text-foreground gap-1 border-0"
                    data-testid={`badge-likes-${plan.id}`}
                  >
                    <Heart className="w-3 h-3 fill-current text-rose-500" />
                    {plan.likes}
                  </Badge>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-white font-bold text-2xl mb-2 drop-shadow-md" data-testid={`text-title-${plan.id}`}>
                    {plan.title}
                  </h3>
                  
                  {/* Creator & Category */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7 border-2 border-white/80" data-testid={`avatar-${plan.id}`}>
                        <AvatarFallback className={`${plan.creator.color} text-white text-xs font-semibold`}>
                          {plan.creator.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white/90 text-sm font-medium drop-shadow" data-testid={`text-creator-${plan.id}`}>
                        by {plan.creator.name}
                      </span>
                    </div>
                    
                    <Badge 
                      variant="secondary" 
                      className="bg-white/20 backdrop-blur-sm text-white border-white/30"
                      data-testid={`badge-category-${plan.id}`}
                    >
                      {plan.category}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 bg-card">
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-description-${plan.id}`}>
                  {plan.description}
                </p>

                {/* View Count & Use Button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Eye className="w-4 h-4" />
                    <span data-testid={`text-views-${plan.id}`}>{plan.views}</span>
                  </div>
                  
                  <Button
                    className="gap-2"
                    onClick={() => handleUsePlan(plan)}
                    disabled={createGroupActivityMutation.isPending}
                    data-testid={`button-use-plan-${plan.id}`}
                  >
                    <Copy className="w-4 h-4" />
                    {createGroupActivityMutation.isPending ? "Creating..." : "Use This Plan"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-16" data-testid="empty-state">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">
              No plans found in this category yet.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Try selecting a different category above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
