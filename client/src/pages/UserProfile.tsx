import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ProBadge } from '@/components/ProBadge';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import {
  User,
  Calendar,
  MapPin,
  Briefcase,
  Heart,
  Trophy,
  Target,
  Activity,
  Edit3,
  Save,
  X,
  Star,
  TrendingUp,
  Clock,
  Upload,
  Camera,
  Navigation,
  Loader2,
  Check,
  AlertCircle,
  Plus
} from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  nickname?: string;
  publicBio?: string;
  privateBio?: string;
  birthDate?: string;
  ethnicity?: string;
  height?: string;
  weight?: string;
  location?: string;
  occupation?: string;
  interests?: string[];
  lifeGoals?: string[];
  smartScore: number;
  totalTasksCompleted: number;
  streakDays: number;
  createdAt: string;
  lastActiveDate: string;
}

export default function UserProfile() {
  const { user, isAuthenticated, isLoading, refetch: refetchAuth } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get full user profile
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/user/profile'],
    enabled: isAuthenticated,
  });

  // Debug: Log profile image URL when profile data changes
  useEffect(() => {
    if (profile) {
      console.log('[PROFILE IMAGE] Profile loaded, image URL:', {
        hasImage: !!profile.profileImageUrl,
        imageLength: profile.profileImageUrl?.length || 0,
        isDataUrl: profile.profileImageUrl?.startsWith('data:') || false,
        first50chars: profile.profileImageUrl?.substring(0, 50) || 'none'
      });
    }
  }, [profile]);

  // Device location state
  const deviceLocation = useDeviceLocation();

  // Get current location settings
  interface LocationData {
    locationEnabled: boolean;
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    updatedAt: string | null;
  }

  const { data: locationData, isLoading: locationLoading } = useQuery<LocationData>({
    queryKey: ['/api/user/location'],
    enabled: isAuthenticated,
  });

  // Location update mutation
  const updateLocationMutation = useMutation({
    mutationFn: (data: { enabled: boolean; latitude?: number; longitude?: number; city?: string }) =>
      apiRequest('PUT', '/api/user/location', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/location'] });
      toast({
        title: "Location updated",
        description: "Your location settings have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update location settings.",
        variant: "destructive",
      });
    },
  });

  // Handle enabling location
  const handleEnableLocation = async () => {
    const location = await deviceLocation.requestLocation();
    if (location) {
      updateLocationMutation.mutate({
        enabled: true,
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
      });
    }
  };

  // Handle disabling location
  const handleDisableLocation = () => {
    updateLocationMutation.mutate({ enabled: false });
  };

  const updateProfileMutation = useMutation({
    mutationFn: (updates: Partial<UserProfile>) => 
      apiRequest('PUT', '/api/user/profile', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      setIsEditing(false);
      setEditingSection(null);
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      // Convert file to base64
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          console.log('[PROFILE IMAGE] Uploading image, size:', base64String.length);
          apiRequest('PUT', '/api/user/profile/image', { imageData: base64String })
            .then(() => {
              console.log('[PROFILE IMAGE] Upload successful');
              resolve(base64String);
            })
            .catch((err) => {
              console.error('[PROFILE IMAGE] Upload failed:', err);
              reject(err);
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    onSuccess: async (uploadedImageUrl: string) => {
      console.log('[PROFILE IMAGE] Upload success, updating caches directly');

      // Directly update the profile cache with new image
      queryClient.setQueryData(['/api/user/profile'], (old: any) => {
        if (old) {
          return { ...old, profileImageUrl: uploadedImageUrl };
        }
        return old;
      });

      // Directly update the user cache with new image
      queryClient.setQueryData(['/api/user'], (old: any) => {
        if (old) {
          return { ...old, profileImageUrl: uploadedImageUrl };
        }
        return old;
      });

      // Also invalidate to ensure next fetch gets fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });

      // Dispatch custom event for sidebar to listen to (backup)
      window.dispatchEvent(new CustomEvent('profileImageUpdated', { detail: { imageUrl: uploadedImageUrl } }));

      console.log('[PROFILE IMAGE] Caches updated and event dispatched');
      toast({
        title: "Image uploaded",
        description: "Your profile picture has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('[PROFILE IMAGE] Mutation error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    uploadImageMutation.mutate(file);
  };

  if (isLoading || profileLoading) {
    return (
      <div className="container mx-auto p-3 sm:p-6 max-w-4xl">
        <div className="space-y-4 sm:space-y-6">
          <div className="h-6 sm:h-8 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="h-24 sm:h-32 bg-muted animate-pulse rounded-lg" />
              <div className="h-20 sm:h-24 bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="md:col-span-2 space-y-3 sm:space-y-4">
              <div className="h-40 sm:h-48 bg-muted animate-pulse rounded-lg" />
              <div className="h-24 sm:h-32 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="container mx-auto p-3 sm:p-6 max-w-4xl">
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            <User className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Sign in required</h3>
            <p className="text-sm sm:text-base text-muted-foreground">Please sign in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    return monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) ? age - 1 : age;
  };

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const ProfileEditSection = ({
    title,
    sectionKey,
    children,
    icon
  }: {
    title: string;
    sectionKey: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editingSection === sectionKey) {
              setEditingSection(null);
            } else {
              setEditingSection(sectionKey);
            }
          }}
          data-testid={`button-edit-${sectionKey}`}
        >
          {editingSection === sectionKey ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl" data-testid="page-user-profile">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Badge variant="secondary" className="gap-1">
          <Star className="w-3 h-3" />
          Smart Score: {profile.smartScore}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Profile Overview */}
        <div className="space-y-6">
          {/* Profile Picture & Basic Info */}
          <Card data-testid="card-profile-basic">
            <CardContent className="p-6 text-center">
              <div className="relative inline-block mb-4">
                <Avatar className="w-24 h-24 mx-auto group">
                  <AvatarImage 
                    src={profile.profileImageUrl} 
                    alt={profile.nickname || profile.firstName || profile.username} 
                  />
                  <AvatarFallback className="text-lg">
                    {(profile.nickname || profile.firstName || profile.username)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                  <div 
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-8 px-3 gap-1 shadow-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadImageMutation.isPending}
                  data-testid="button-upload-image"
                >
                  {uploadImageMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-3 h-3" />
                      <span className="text-xs">{profile.profileImageUrl ? 'Change' : 'Upload'}</span>
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  data-testid="input-upload-image"
                />
              </div>
              
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-bold mb-1" data-testid="text-profile-name">
                  {profile.nickname || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.username}
                  {((user as any)?.subscriptionTier === 'pro' || (user as any)?.subscriptionTier === 'family') && (
                    <span className="ml-2 inline-block align-middle">
                      <ProBadge size="sm" variant="full" />
                    </span>
                  )}
                </h2>
              </div>
              
              {profile.username && (profile.nickname || profile.firstName) && (
                <p className="text-muted-foreground text-sm mb-2">@{profile.username}</p>
              )}
              
              {profile.occupation && (
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-2">
                  <Briefcase className="w-3 h-3" />
                  {profile.occupation}
                </div>
              )}
              
              {profile.location && (
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-4">
                  <MapPin className="w-3 h-3" />
                  {profile.location}
                </div>
              )}

              {profile.publicBio && (
                <p className="text-sm text-muted-foreground mb-4" data-testid="text-public-bio">
                  {profile.publicBio}
                </p>
              )}

              <div className="text-xs text-muted-foreground">
                Member since {formatJoinDate(profile.createdAt)}
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card data-testid="card-profile-stats">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Activity Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Tasks Completed</span>
                </div>
                <span className="font-semibold" data-testid="text-tasks-completed">
                  {profile.totalTasksCompleted}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Current Streak</span>
                </div>
                <span className="font-semibold" data-testid="text-streak-days">
                  {profile.streakDays} days
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Last Active</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(profile.lastActiveDate).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Detailed Information */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="personal" data-testid="tab-personal" className="text-xs sm:text-sm py-2">Personal</TabsTrigger>
              <TabsTrigger value="interests" data-testid="tab-interests" className="text-xs sm:text-sm py-2">Interests</TabsTrigger>
              <TabsTrigger value="private" data-testid="tab-private" className="text-xs sm:text-sm py-2">Private</TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-4">
              <ProfileEditSection title="Basic Information" sectionKey="basic">
                {editingSection === 'basic' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          defaultValue={profile.firstName || ''}
                          placeholder="Your first name"
                          data-testid="input-first-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          defaultValue={profile.lastName || ''}
                          placeholder="Your last name"
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="nickname">Nickname/Display Name</Label>
                      <Input
                        id="nickname"
                        defaultValue={profile.nickname || ''}
                        placeholder="How you'd like to be called"
                        data-testid="input-nickname"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        defaultValue={profile.email || ''}
                        placeholder="your.email@example.com"
                        data-testid="input-email"
                      />
                    </div>

                    <div>
                      <Label htmlFor="publicBio">Public Bio</Label>
                      <Textarea
                        id="publicBio"
                        defaultValue={profile.publicBio || ''}
                        placeholder="Tell others about yourself..."
                        className="resize-none"
                        rows={3}
                        data-testid="textarea-public-bio"
                      />
                    </div>

                    <Button
                      onClick={() => {
                        const formData = new FormData();
                        const form = document.querySelector('[data-testid="input-first-name"]')?.closest('div')?.parentElement;
                        if (form) {
                          const firstName = (form.querySelector('[data-testid="input-first-name"]') as HTMLInputElement)?.value;
                          const lastName = (form.querySelector('[data-testid="input-last-name"]') as HTMLInputElement)?.value;
                          const nickname = (form.querySelector('[data-testid="input-nickname"]') as HTMLInputElement)?.value;
                          const email = (form.querySelector('[data-testid="input-email"]') as HTMLInputElement)?.value;
                          const publicBio = (form.querySelector('[data-testid="textarea-public-bio"]') as HTMLTextAreaElement)?.value;

                          updateProfileMutation.mutate({
                            firstName: firstName || undefined,
                            lastName: lastName || undefined,
                            nickname: nickname || undefined,
                            email: email || undefined,
                            publicBio: publicBio || undefined,
                          });
                        }
                      }}
                      disabled={updateProfileMutation.isPending}
                      className="w-full"
                      data-testid="button-save-basic"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {profile.firstName} {profile.lastName}</p>
                    {profile.nickname && <p><strong>Nickname:</strong> {profile.nickname}</p>}
                    <p><strong>Email:</strong> {profile.email || 'Not provided'}</p>
                    <p><strong>Public Bio:</strong> {profile.publicBio || 'No bio added yet'}</p>
                  </div>
                )}
              </ProfileEditSection>

              <ProfileEditSection title="Personal Details" sectionKey="details">
                {editingSection === 'details' ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="birthDate">Birth Date</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        defaultValue={profile.birthDate || ''}
                        data-testid="input-birth-date"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="height">Height</Label>
                        <Input
                          id="height"
                          defaultValue={profile.height || ''}
                          placeholder="e.g., 5'10&quot; or 178cm"
                          data-testid="input-height"
                        />
                      </div>
                      <div>
                        <Label htmlFor="weight">Weight</Label>
                        <Input
                          id="weight"
                          defaultValue={profile.weight || ''}
                          placeholder="e.g., 150 lbs or 68 kg"
                          data-testid="input-weight"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="ethnicity">Ethnicity (Optional)</Label>
                      <Input
                        id="ethnicity"
                        defaultValue={profile.ethnicity || ''}
                        placeholder="Your ethnic background"
                        data-testid="input-ethnicity"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          defaultValue={profile.location || ''}
                          placeholder="City, State/Country"
                          data-testid="input-location"
                        />
                      </div>
                      <div>
                        <Label htmlFor="occupation">Occupation</Label>
                        <Input
                          id="occupation"
                          defaultValue={profile.occupation || ''}
                          placeholder="Your job title"
                          data-testid="input-occupation"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        const form = document.querySelector('[data-testid="input-birth-date"]')?.closest('div')?.parentElement;
                        if (form) {
                          const birthDate = (form.querySelector('[data-testid="input-birth-date"]') as HTMLInputElement)?.value;
                          const height = (form.querySelector('[data-testid="input-height"]') as HTMLInputElement)?.value;
                          const weight = (form.querySelector('[data-testid="input-weight"]') as HTMLInputElement)?.value;
                          const ethnicity = (form.querySelector('[data-testid="input-ethnicity"]') as HTMLInputElement)?.value;
                          const location = (form.querySelector('[data-testid="input-location"]') as HTMLInputElement)?.value;
                          const occupation = (form.querySelector('[data-testid="input-occupation"]') as HTMLInputElement)?.value;

                          updateProfileMutation.mutate({
                            birthDate: birthDate || undefined,
                            height: height || undefined,
                            weight: weight || undefined,
                            ethnicity: ethnicity || undefined,
                            location: location || undefined,
                            occupation: occupation || undefined,
                          });
                        }
                      }}
                      disabled={updateProfileMutation.isPending}
                      className="w-full"
                      data-testid="button-save-details"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p><strong>Age:</strong> {profile.birthDate ? `${calculateAge(profile.birthDate)} years old` : 'Not provided'}</p>
                    <p><strong>Height:</strong> {profile.height || 'Not provided'}</p>
                    <p><strong>Weight:</strong> {profile.weight || 'Not provided'}</p>
                    <p><strong>Ethnicity:</strong> {profile.ethnicity || 'Not provided'}</p>
                    <p><strong>Location:</strong> {profile.location || 'Not provided'}</p>
                    <p><strong>Occupation:</strong> {profile.occupation || 'Not provided'}</p>
                  </div>
                )}
              </ProfileEditSection>

              {/* Device Location Permission Section */}
              <Card data-testid="card-device-location">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    Device Location
                  </CardTitle>
                  {locationLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : locationData?.locationEnabled ? (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="w-3 h-3" />
                      Enabled
                    </Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enable device location for personalized plan recommendations based on your current location.
                    This helps us suggest nearby venues, activities, and experiences.
                  </p>

                  {locationData?.locationEnabled ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <MapPin className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium" data-testid="text-current-city">
                            {locationData.city || 'Location detected'}
                          </p>
                          {locationData.updatedAt && (
                            <p className="text-xs text-muted-foreground">
                              Last updated: {new Date(locationData.updatedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEnableLocation}
                          disabled={deviceLocation.isRequesting || updateLocationMutation.isPending}
                          data-testid="button-refresh-location"
                        >
                          {deviceLocation.isRequesting ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3 h-3 mr-2" />
                              Refresh Location
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDisableLocation}
                          disabled={updateLocationMutation.isPending}
                          data-testid="button-disable-location"
                        >
                          <X className="w-3 h-3 mr-2" />
                          Disable
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deviceLocation.isDenied && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive" data-testid="alert-location-denied">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium">Location access denied</p>
                            <p className="text-xs mt-1">To enable location features:</p>
                            <ul className="text-xs mt-1 ml-4 list-disc space-y-0.5">
                              <li>Open your browser or device settings</li>
                              <li>Find location/privacy permissions</li>
                              <li>Allow location access for this site</li>
                              <li>Return here and try again</li>
                            </ul>
                          </div>
                        </div>
                      )}

                      {deviceLocation.isInsecure && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400" data-testid="alert-location-insecure">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium">Secure connection recommended</p>
                            <p className="text-xs mt-1">Location access works best with HTTPS. You can still try enabling location, but it may not work on all browsers. For best results, use the mobile app.</p>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handleEnableLocation}
                        disabled={deviceLocation.isRequesting || updateLocationMutation.isPending}
                        className="w-full"
                        data-testid="button-enable-location"
                      >
                        {deviceLocation.isRequesting || updateLocationMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Getting Location...
                          </>
                        ) : deviceLocation.isDenied ? (
                          <>
                            <Navigation className="w-4 h-4 mr-2" />
                            Try Again
                          </>
                        ) : (
                          <>
                            <Navigation className="w-4 h-4 mr-2" />
                            Enable Device Location
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        Your location is only used for plan suggestions and is stored securely.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Interests & Goals Tab - Editable */}
            <TabsContent value="interests" className="space-y-4">
              <ProfileEditSection title="Interests & Hobbies" sectionKey="interests" icon={<Heart className="w-4 h-4" />}>
                {editingSection === 'interests' ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {(profile.interests || []).map((interest, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1 pr-1">
                          {interest}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 hover:bg-destructive/20"
                            onClick={() => {
                              const newInterests = [...(profile.interests || [])];
                              newInterests.splice(index, 1);
                              updateProfileMutation.mutate({ interests: newInterests });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add an interest (e.g., hiking, cooking)"
                        id="new-interest-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            const value = input.value.trim();
                            if (value) {
                              const newInterests = [...(profile.interests || []), value];
                              updateProfileMutation.mutate({ interests: newInterests });
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const input = document.getElementById('new-interest-input') as HTMLInputElement;
                          const value = input?.value.trim();
                          if (value) {
                            const newInterests = [...(profile.interests || []), value];
                            updateProfileMutation.mutate({ interests: newInterests });
                            input.value = '';
                          }
                        }}
                        disabled={updateProfileMutation.isPending}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add your hobbies and interests to help personalize your experience
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests && profile.interests.length > 0 ? (
                      profile.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary" data-testid={`badge-interest-${index}`}>
                          {interest}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">No interests added yet. Click edit to add your hobbies!</p>
                    )}
                  </div>
                )}
              </ProfileEditSection>

              <ProfileEditSection title="Life Goals" sectionKey="lifeGoals" icon={<Target className="w-4 h-4" />}>
                {editingSection === 'lifeGoals' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {(profile.lifeGoals || []).map((goal, index) => (
                        <div key={index} className="flex items-center gap-2 group">
                          <Target className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm flex-1">{goal}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const newGoals = [...(profile.lifeGoals || [])];
                              newGoals.splice(index, 1);
                              updateProfileMutation.mutate({ lifeGoals: newGoals });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a life goal (e.g., Travel to Japan)"
                        id="new-goal-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            const value = input.value.trim();
                            if (value) {
                              const newGoals = [...(profile.lifeGoals || []), value];
                              updateProfileMutation.mutate({ lifeGoals: newGoals });
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const input = document.getElementById('new-goal-input') as HTMLInputElement;
                          const value = input?.value.trim();
                          if (value) {
                            const newGoals = [...(profile.lifeGoals || []), value];
                            updateProfileMutation.mutate({ lifeGoals: newGoals });
                            input.value = '';
                          }
                        }}
                        disabled={updateProfileMutation.isPending}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add your long-term aspirations and dreams to track your progress
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profile.lifeGoals && profile.lifeGoals.length > 0 ? (
                      profile.lifeGoals.map((goal, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Target className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm" data-testid={`text-goal-${index}`}>{goal}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">No life goals added yet. Click edit to add your aspirations!</p>
                    )}
                  </div>
                )}
              </ProfileEditSection>
            </TabsContent>

            {/* Private Notes Tab */}
            <TabsContent value="private" className="space-y-4">
              <ProfileEditSection title="Private Notes" sectionKey="private">
                {editingSection === 'private' ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="privateBio">Private Bio & Notes</Label>
                      <Textarea
                        id="privateBio"
                        defaultValue={profile.privateBio || ''}
                        placeholder="Personal notes, reminders, or private thoughts about yourself..."
                        className="resize-none"
                        rows={6}
                        data-testid="textarea-private-bio"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        This information is private and only visible to you.
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        const privateBio = (document.querySelector('[data-testid="textarea-private-bio"]') as HTMLTextAreaElement)?.value;
                        updateProfileMutation.mutate({
                          privateBio: privateBio || undefined,
                        });
                      }}
                      disabled={updateProfileMutation.isPending}
                      className="w-full"
                      data-testid="button-save-private"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Private Notes'}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm whitespace-pre-wrap">
                      {profile.privateBio || 'No private notes added yet. Click edit to add personal reminders or notes about yourself.'}
                    </p>
                  </div>
                )}
              </ProfileEditSection>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}