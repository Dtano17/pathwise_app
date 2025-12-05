import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { ProBadge } from '@/components/ProBadge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  Camera
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
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state for editable fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    email: '',
    publicBio: '',
    birthDate: '',
    height: '',
    weight: '',
    ethnicity: '',
    location: '',
    occupation: '',
    privateBio: '',
  });
  
  // Track if form has been initialized from profile data
  const formInitialized = useRef(false);
  
  // Get full user profile
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/user/profile'],
    enabled: isAuthenticated,
  });
  
  // Initialize form data from profile only once when profile first loads
  useEffect(() => {
    if (profile && !formInitialized.current) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        nickname: profile.nickname || '',
        email: profile.email || '',
        publicBio: profile.publicBio || '',
        birthDate: profile.birthDate || '',
        height: profile.height || '',
        weight: profile.weight || '',
        ethnicity: profile.ethnicity || '',
        location: profile.location || '',
        occupation: profile.occupation || '',
        privateBio: profile.privateBio || '',
      });
      formInitialized.current = true;
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (updates: Partial<UserProfile>) => 
      apiRequest('PUT', '/api/user/profile', updates),
    onSuccess: () => {
      // Reset form initialized flag so it picks up new data after save
      formInitialized.current = false;
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
          apiRequest('PUT', '/api/user/profile/image', { imageData: base64String })
            .then(() => resolve(base64String))
            .catch(reject);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Image uploaded",
        description: "Your profile picture has been updated successfully.",
      });
    },
    onError: (error: any) => {
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
    children 
  }: { 
    title: string;
    sectionKey: string;
    children: React.ReactNode;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
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
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarImage 
                    src={profile.profileImageUrl} 
                    alt={profile.nickname || profile.firstName || profile.username} 
                  />
                  <AvatarFallback className="text-lg">
                    {(profile.nickname || profile.firstName || profile.username)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-8 px-3 gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadImageMutation.isPending}
                  data-testid="button-upload-image"
                >
                  {uploadImageMutation.isPending ? (
                    <span className="text-xs">Uploading...</span>
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
              
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-xl font-bold" data-testid="text-profile-name">
                  {profile.nickname || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.username}
                </h2>
                {(user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'family') && (
                  <ProBadge size="md" />
                )}
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
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          placeholder="Your first name"
                          data-testid="input-first-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          placeholder="Your last name"
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="nickname">Nickname/Display Name</Label>
                      <Input
                        id="nickname"
                        value={formData.nickname}
                        onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                        placeholder="How you'd like to be called"
                        data-testid="input-nickname"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="your.email@example.com"
                        data-testid="input-email"
                      />
                    </div>

                    <div>
                      <Label htmlFor="publicBio">Public Bio</Label>
                      <Textarea
                        id="publicBio"
                        value={formData.publicBio}
                        onChange={(e) => setFormData({...formData, publicBio: e.target.value})}
                        placeholder="Tell others about yourself..."
                        className="resize-none"
                        rows={3}
                        data-testid="textarea-public-bio"
                      />
                    </div>

                    <Button
                      onClick={() => {
                        updateProfileMutation.mutate({
                          firstName: formData.firstName || undefined,
                          lastName: formData.lastName || undefined,
                          nickname: formData.nickname || undefined,
                          email: formData.email || undefined,
                          publicBio: formData.publicBio || undefined,
                        });
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
                        value={formData.birthDate}
                        onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                        data-testid="input-birth-date"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="height">Height</Label>
                        <Input
                          id="height"
                          value={formData.height}
                          onChange={(e) => setFormData({...formData, height: e.target.value})}
                          placeholder="e.g., 5'10&quot; or 178cm"
                          data-testid="input-height"
                        />
                      </div>
                      <div>
                        <Label htmlFor="weight">Weight</Label>
                        <Input
                          id="weight"
                          value={formData.weight}
                          onChange={(e) => setFormData({...formData, weight: e.target.value})}
                          placeholder="e.g., 150 lbs or 68 kg"
                          data-testid="input-weight"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="ethnicity">Ethnicity (Optional)</Label>
                      <Input
                        id="ethnicity"
                        value={formData.ethnicity}
                        onChange={(e) => setFormData({...formData, ethnicity: e.target.value})}
                        placeholder="Your ethnic background"
                        data-testid="input-ethnicity"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                          placeholder="City, State/Country"
                          data-testid="input-location"
                        />
                      </div>
                      <div>
                        <Label htmlFor="occupation">Occupation</Label>
                        <Input
                          id="occupation"
                          value={formData.occupation}
                          onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                          placeholder="Your job title"
                          data-testid="input-occupation"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        updateProfileMutation.mutate({
                          birthDate: formData.birthDate || undefined,
                          height: formData.height || undefined,
                          weight: formData.weight || undefined,
                          ethnicity: formData.ethnicity || undefined,
                          location: formData.location || undefined,
                          occupation: formData.occupation || undefined,
                        });
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
            </TabsContent>

            {/* Interests & Goals Tab */}
            <TabsContent value="interests" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Interests & Hobbies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests && profile.interests.length > 0 ? (
                      profile.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary" data-testid={`badge-interest-${index}`}>
                          {interest}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">No interests added yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Life Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {profile.lifeGoals && profile.lifeGoals.length > 0 ? (
                      profile.lifeGoals.map((goal, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Target className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm" data-testid={`text-goal-${index}`}>{goal}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">No life goals added yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                        value={formData.privateBio}
                        onChange={(e) => setFormData({...formData, privateBio: e.target.value})}
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
                        updateProfileMutation.mutate({
                          privateBio: formData.privateBio || undefined,
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