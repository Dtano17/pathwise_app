import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Sparkles, Calendar, MapPin, Heart, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function WeekendPlans() {
  const [, setLocation] = useLocation();
  const [userLocation, setUserLocation] = useState<string>("near you");

  // Fetch trending weekend plans from community
  const { data: communityPlans } = useQuery({
    queryKey: ['/api/community-plans'],
    queryFn: async () => {
      const res = await fetch('/api/community-plans?limit=12&category=adventure,travel,lifestyle');
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    }
  });

  useEffect(() => {
    // Get user's approximate location (city-level)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Note: You'd use a geocoding API here for production
            setUserLocation("in your area");
          } catch (error) {
            console.error('Error getting location:', error);
          }
        },
        () => {
          // Geolocation denied, use default
        }
      );
    }
  }, []);

  const weekendCategories = [
    { icon: <Heart className="w-6 h-6" />, title: "Date Night", color: "from-pink-500 to-rose-500" },
    { icon: <Calendar className="w-6 h-6" />, title: "Family Fun", color: "from-blue-500 to-indigo-500" },
    { icon: <TrendingUp className="w-6 h-6" />, title: "Adventure", color: "from-orange-500 to-red-500" },
    { icon: <MapPin className="w-6 h-6" />, title: "Local Explore", color: "from-green-500 to-teal-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-600" />
            <span className="font-bold text-xl">JournalMate.ai</span>
          </div>
          <Button onClick={() => setLocation('/')} variant="outline">
            Go to App
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full mb-6 text-sm font-medium">
            <Calendar className="w-4 h-4" />
            This Weekend
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
            Things to Do This Weekend {userLocation}
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Discover {communityPlans?.length || '1,200+'} weekend plans curated by the community. Save your favorites and track your weekend adventures.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gap-2 text-lg px-8 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700"
              onClick={() => setLocation('/discover')}
            >
              Browse All Weekend Plans
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-lg px-8"
              onClick={() => setLocation('/login')}
            >
              Save Your Plans
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-8">Browse by Category</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {weekendCategories.map((cat, idx) => (
            <Card key={idx} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/discover')}>
              <CardHeader>
                <div className={`w-12 h-12 bg-gradient-to-r ${cat.color} rounded-full flex items-center justify-center text-white mb-3`}>
                  {cat.icon}
                </div>
                <CardTitle>{cat.title}</CardTitle>
                <CardDescription>Explore weekend {cat.title.toLowerCase()} plans</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured Plans */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Popular Weekend Plans</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {communityPlans?.slice(0, 6).map((plan: any) => (
            <Card key={plan.id} className="hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setLocation(`/share/${plan.shareToken}`)}>
              <CardHeader>
                <CardTitle className="line-clamp-2">{plan.title}</CardTitle>
                <CardDescription className="line-clamp-3">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{plan.taskCount || 0} activities</span>
                  <span>{plan.categoryName || 'Weekend Fun'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-orange-600 to-yellow-600 text-white p-12 rounded-3xl shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Make This Weekend Unforgettable
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Save plans, track your activities, and journal your weekend adventures automatically.
          </p>
          <Button
            size="lg"
            className="bg-white text-orange-600 hover:bg-gray-100 gap-2 text-lg px-8"
            onClick={() => setLocation('/login')}
          >
            Start Planning
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          © 2024 JournalMate.ai • <a href="/privacy" className="hover:text-orange-600">Privacy</a> • <a href="/terms" className="hover:text-orange-600">Terms</a>
        </div>
      </footer>
    </div>
  );
}
