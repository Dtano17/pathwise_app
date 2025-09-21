import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { MapPin, Heart, Coffee, UtensilsCrossed, Camera, Music, Star, Clock, Navigation } from 'lucide-react';

interface LocationDatePlannerProps {
  onPlanGenerated: (plan: string) => void;
}

interface DateVenue {
  id: string;
  name: string;
  type: 'restaurant' | 'cafe' | 'activity' | 'scenic' | 'entertainment';
  description: string;
  rating: number;
  estimatedTime: string;
  atmosphere: string;
  priceRange: '$' | '$$' | '$$$';
  distance?: string;
}

// Mock data - in a real app, this would come from a maps/places API
const mockVenues: DateVenue[] = [
  {
    id: '1',
    name: 'Rooftop Garden Bistro',
    type: 'restaurant',
    description: 'Romantic dining with city skyline views and intimate lighting',
    rating: 4.6,
    estimatedTime: '2-3 hours',
    atmosphere: 'Romantic & Elegant',
    priceRange: '$$$',
    distance: '0.8 miles'
  },
  {
    id: '2', 
    name: 'Moonlight Coffee & Jazz',
    type: 'cafe',
    description: 'Cozy coffee house with live jazz music and warm ambiance',
    rating: 4.4,
    estimatedTime: '1-2 hours',
    atmosphere: 'Intimate & Musical',
    priceRange: '$$',
    distance: '0.5 miles'
  },
  {
    id: '3',
    name: 'Sunset Pier Walk',
    type: 'scenic',
    description: 'Beautiful waterfront walk perfect for conversation and sunset views',
    rating: 4.8,
    estimatedTime: '1 hour',
    atmosphere: 'Peaceful & Scenic',
    priceRange: '$',
    distance: '1.2 miles'
  },
  {
    id: '4',
    name: 'Interactive Art Gallery',
    type: 'activity',
    description: 'Modern art space with interactive exhibits and wine tastings',
    rating: 4.5,
    estimatedTime: '2-3 hours',
    atmosphere: 'Creative & Sophisticated',
    priceRange: '$$',
    distance: '0.6 miles'
  },
  {
    id: '5',
    name: 'Speakeasy & Games Lounge',
    type: 'entertainment',
    description: 'Hidden cocktail bar with vintage games and craft cocktails',
    rating: 4.7,
    estimatedTime: '2-4 hours',
    atmosphere: 'Fun & Mysterious',
    priceRange: '$$$',
    distance: '0.9 miles'
  }
];

const dateThemes = [
  { 
    id: 'romantic', 
    name: 'Classic Romance', 
    icon: Heart, 
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    description: 'Intimate dinner and scenic walks'
  },
  { 
    id: 'adventurous', 
    name: 'Adventure & Fun', 
    icon: Camera, 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    description: 'Activities and exploration'
  },
  { 
    id: 'cultural', 
    name: 'Cultural Experience', 
    icon: Music, 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    description: 'Art, music, and sophisticated venues'
  },
  { 
    id: 'casual', 
    name: 'Casual & Cozy', 
    icon: Coffee, 
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    description: 'Relaxed atmosphere and conversation'
  }
];

export default function LocationDatePlanner({ onPlanGenerated }: LocationDatePlannerProps) {
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedVenues, setSelectedVenues] = useState<DateVenue[]>([]);

  const requestLocation = () => {
    setLocationStatus('requesting');
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus('granted');
        },
        (error) => {
          console.error('Location error:', error);
          setLocationStatus('denied');
          // For demo purposes, set a default location
          setCurrentLocation({ lat: 40.7128, lng: -74.0060 }); // NYC coordinates
        }
      );
    } else {
      setLocationStatus('denied');
      setCurrentLocation({ lat: 40.7128, lng: -74.0060 });
    }
  };

  const generateDatePlan = () => {
    if (selectedVenues.length === 0) return;
    
    const theme = dateThemes.find(t => t.id === selectedTheme);
    const venueList = selectedVenues.map(v => 
      `${v.name} (${v.atmosphere}, ${v.estimatedTime})`
    ).join(' → ');
    
    const plan = `Plan a ${theme?.name.toLowerCase() || 'perfect'} date tonight: ${venueList}. Create a detailed itinerary with timing, conversation starters, and backup options based on my location.`;
    
    onPlanGenerated(plan);
  };

  const getVenueIcon = (type: DateVenue['type']) => {
    switch (type) {
      case 'restaurant': return UtensilsCrossed;
      case 'cafe': return Coffee;
      case 'scenic': return Camera;
      case 'activity': return Star;
      case 'entertainment': return Music;
      default: return MapPin;
    }
  };

  const getThemeVenues = (themeId: string) => {
    switch (themeId) {
      case 'romantic':
        return mockVenues.filter(v => ['restaurant', 'scenic'].includes(v.type));
      case 'adventurous':
        return mockVenues.filter(v => ['activity', 'scenic', 'entertainment'].includes(v.type));
      case 'cultural':
        return mockVenues.filter(v => ['activity', 'cafe', 'entertainment'].includes(v.type));
      case 'casual':
        return mockVenues.filter(v => ['cafe', 'scenic'].includes(v.type));
      default:
        return mockVenues;
    }
  };

  const toggleVenue = (venue: DateVenue) => {
    setSelectedVenues(prev => 
      prev.find(v => v.id === venue.id)
        ? prev.filter(v => v.id !== venue.id)
        : [...prev, venue]
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Heart className="w-6 h-6 text-pink-500" />
          Perfect Date Night Planner
        </h2>
        <p className="text-muted-foreground">
          Find amazing places nearby and create the perfect date itinerary
        </p>
      </div>

      {/* Location Access */}
      {locationStatus === 'idle' && (
        <Card className="p-6 text-center">
          <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Find Perfect Places Nearby</h3>
          <p className="text-muted-foreground mb-4">
            Allow location access to discover the best date spots around you
          </p>
          <Button onClick={requestLocation} className="gap-2" data-testid="button-request-location">
            <Navigation className="w-4 h-4" />
            Find Places Near Me
          </Button>
        </Card>
      )}

      {locationStatus === 'requesting' && (
        <Card className="p-6 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Getting your location...</p>
        </Card>
      )}

      {(locationStatus === 'granted' || locationStatus === 'denied') && (
        <>
          {/* Theme Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose Your Date Theme</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {dateThemes.map((theme) => (
                <Button
                  key={theme.id}
                  variant={selectedTheme === theme.id ? "default" : "outline"}
                  className="h-auto p-4 flex-col gap-2"
                  onClick={() => setSelectedTheme(theme.id)}
                  data-testid={`button-theme-${theme.id}`}
                >
                  <theme.icon className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">{theme.name}</div>
                    <div className="text-xs text-muted-foreground">{theme.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Venue Selection */}
          {selectedTheme && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Select Your Date Spots</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getThemeVenues(selectedTheme).map((venue) => {
                  const VenueIcon = getVenueIcon(venue.type);
                  const isSelected = selectedVenues.find(v => v.id === venue.id);
                  
                  return (
                    <Card
                      key={venue.id}
                      className={`p-4 cursor-pointer transition-all duration-200 hover-elevate ${
                        isSelected ? 'ring-2 ring-primary shadow-lg bg-primary/5' : ''
                      }`}
                      onClick={() => toggleVenue(venue)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <VenueIcon className="w-5 h-5 text-primary" />
                            <div>
                              <h4 className="font-semibold">{venue.name}</h4>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>{venue.rating}</span>
                                <span>•</span>
                                <span>{venue.distance}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">{venue.priceRange}</Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{venue.description}</p>
                        
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="secondary">{venue.atmosphere}</Badge>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{venue.estimatedTime}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Generate Plan */}
          {selectedVenues.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="p-4 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20">
                <h4 className="font-semibold mb-2">Your Date Plan ({selectedVenues.length} stops)</h4>
                <div className="flex items-center gap-2 mb-3">
                  {selectedVenues.map((venue, idx) => (
                    <div key={venue.id} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">{venue.name}</Badge>
                      {idx < selectedVenues.length - 1 && <span className="text-muted-foreground">→</span>}
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={generateDatePlan} 
                  className="w-full gap-2"
                  data-testid="button-generate-date-plan"
                >
                  <Heart className="w-4 h-4" />
                  Create Perfect Date Itinerary
                </Button>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}