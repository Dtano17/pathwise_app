import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { signupUserSchema, profileCompletionSchema, type SignupUser, type ProfileCompletion } from '@shared/schema';
import { CheckCircle, User, Heart, Target, Clock, MapPin, Briefcase, ArrowLeft, ArrowRight } from 'lucide-react';

interface SignUpProps {
  onSignUpComplete: (user: any) => void;
  onBackToLogin: () => void;
}

export default function SignUp({ onSignUpComplete, onBackToLogin }: SignUpProps) {
  const [step, setStep] = useState<'signup' | 'profile' | 'complete'>(1);
  const [userId, setUserId] = useState<string>('');
  const [progress, setProgress] = useState(20);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Step 1: Basic signup form
  const signupForm = useForm<SignupUser>({
    resolver: zodResolver(signupUserSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
  });

  // Step 2: Profile completion form
  const profileForm = useForm<ProfileCompletion>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      age: undefined,
      occupation: '',
      location: '',
      fitnessLevel: '',
      motivationStyle: '',
      difficultyPreference: 'medium',
      interests: [],
      communicationStyle: '',
      aboutMe: '',
      currentChallenges: [],
      successFactors: [],
      primaryGoalCategories: [],
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: SignupUser) => {
      const { confirmPassword, ...signupData } = data;
      const response = await apiRequest('POST', '/api/auth/signup', signupData);
      return response.json();
    },
    onSuccess: (data) => {
      setUserId(data.user.id);
      setStep('profile');
      setProgress(60);
      toast({
        title: "Account Created!",
        description: "Let's personalize your experience to create better goals.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error?.response?.error || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Profile completion mutation
  const profileMutation = useMutation({
    mutationFn: async (data: ProfileCompletion) => {
      const response = await apiRequest('PUT', `/api/users/${userId}/profile`, data);
      return response.json();
    },
    onSuccess: (data) => {
      setStep('complete');
      setProgress(100);
      toast({
        title: "Profile Complete!",
        description: "Your personalized journey begins now.",
      });
      setTimeout(() => {
        onSignUpComplete(data.user);
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Profile Update Failed",
        description: error?.response?.error || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSignup = (data: SignupUser) => {
    signupMutation.mutate(data);
  };

  const handleProfileCompletion = (data: ProfileCompletion) => {
    profileMutation.mutate(data);
  };

  // Helper for managing array fields
  const toggleArrayField = (
    field: 'interests' | 'currentChallenges' | 'successFactors' | 'primaryGoalCategories',
    value: string
  ) => {
    const currentValues = profileForm.watch(field) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    profileForm.setValue(field, newValues);
  };

  const interestOptions = [
    'Fitness & Health', 'Career Growth', 'Learning & Education', 'Creative Arts',
    'Technology', 'Travel', 'Cooking', 'Reading', 'Music', 'Sports',
    'Meditation', 'Entrepreneurship', 'Photography', 'Gaming', 'Volunteering'
  ];

  const goalCategoryOptions = [
    'Health & Fitness', 'Career & Work', 'Personal Development', 'Relationships',
    'Financial', 'Education', 'Hobbies', 'Spiritual', 'Travel', 'Family'
  ];

  const challengeOptions = [
    'Time Management', 'Motivation', 'Consistency', 'Prioritization',
    'Work-Life Balance', 'Health Issues', 'Financial Constraints', 'Focus',
    'Overwhelm', 'Perfectionism', 'Procrastination', 'Stress'
  ];

  const successFactorOptions = [
    'Clear Deadlines', 'Accountability Partner', 'Small Steps', 'Rewards',
    'Visual Progress', 'Community Support', 'Routine', 'Flexibility',
    'Public Commitment', 'Regular Check-ins', 'Celebration', 'Learning'
  ];

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-emerald-50 dark:from-purple-950 dark:via-gray-950 dark:to-emerald-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8">
            <div className="space-y-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to JournalMate!</h2>
                <p className="text-muted-foreground">
                  Your profile is complete. We'll use this information to create personalized goals that fit your lifestyle and preferences.
                </p>
              </div>
              <Progress value={100} className="w-full" />
              <p className="text-sm text-muted-foreground">Taking you to your dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-emerald-50 dark:from-purple-950 dark:via-gray-950 dark:to-emerald-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep('signup')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Progress value={progress} className="flex-1 mx-4" />
              <span className="text-sm text-muted-foreground">Step 2/2</span>
            </div>
            <CardTitle className="text-center">Tell Us About Yourself</CardTitle>
            <CardDescription className="text-center">
              This helps us create personalized goals that fit your lifestyle and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(handleProfileCompletion)} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    {...profileForm.register('age', { valueAsNumber: true })}
                    placeholder="Your age"
                  />
                </div>
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    {...profileForm.register('occupation')}
                    placeholder="Your job or role"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...profileForm.register('location')}
                  placeholder="City, Country"
                />
              </div>

              {/* Lifestyle Preferences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Fitness Level</Label>
                  <Select onValueChange={(value) => profileForm.setValue('fitnessLevel', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fitness level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Communication Style</Label>
                  <Select onValueChange={(value) => profileForm.setValue('communicationStyle', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="How should we communicate?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="encouraging">Encouraging & Supportive</SelectItem>
                      <SelectItem value="direct">Direct & To-the-Point</SelectItem>
                      <SelectItem value="detailed">Detailed & Thorough</SelectItem>
                      <SelectItem value="brief">Brief & Concise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Goal Categories */}
              <div>
                <Label>Primary Goal Areas (Select up to 3)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {goalCategoryOptions.map((category) => (
                    <Badge
                      key={category}
                      variant={(profileForm.watch('primaryGoalCategories') || []).includes(category) ? 'default' : 'outline'}
                      className="cursor-pointer p-2 text-center justify-center"
                      onClick={() => toggleArrayField('primaryGoalCategories', category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <Label>Interests & Hobbies</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {interestOptions.map((interest) => (
                    <Badge
                      key={interest}
                      variant={(profileForm.watch('interests') || []).includes(interest) ? 'default' : 'outline'}
                      className="cursor-pointer p-2 text-center justify-center"
                      onClick={() => toggleArrayField('interests', interest)}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Current Challenges */}
              <div>
                <Label>Current Challenges</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {challengeOptions.map((challenge) => (
                    <Badge
                      key={challenge}
                      variant={(profileForm.watch('currentChallenges') || []).includes(challenge) ? 'default' : 'outline'}
                      className="cursor-pointer p-2 text-center justify-center"
                      onClick={() => toggleArrayField('currentChallenges', challenge)}
                    >
                      {challenge}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Success Factors */}
              <div>
                <Label>What Helps You Succeed?</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {successFactorOptions.map((factor) => (
                    <Badge
                      key={factor}
                      variant={(profileForm.watch('successFactors') || []).includes(factor) ? 'default' : 'outline'}
                      className="cursor-pointer p-2 text-center justify-center"
                      onClick={() => toggleArrayField('successFactors', factor)}
                    >
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* About Me */}
              <div>
                <Label htmlFor="aboutMe">Tell us about yourself (Optional)</Label>
                <Textarea
                  id="aboutMe"
                  {...profileForm.register('aboutMe')}
                  placeholder="Share anything else that would help us create better goals for you..."
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? 'Creating Your Profile...' : 'Complete Profile'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Signup form
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-emerald-50 dark:from-purple-950 dark:via-gray-950 dark:to-emerald-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBackToLogin}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
            <Progress value={progress} className="flex-1 mx-4" />
            <span className="text-sm text-muted-foreground">Step 1/2</span>
          </div>
          <CardTitle className="text-center">Create Your Account</CardTitle>
          <CardDescription className="text-center">
            Join JournalMate to start your personalized goal journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...signupForm.register('firstName')}
                  placeholder="John"
                />
                {signupForm.formState.errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">{signupForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...signupForm.register('lastName')}
                  placeholder="Doe"
                />
                {signupForm.formState.errors.lastName && (
                  <p className="text-sm text-red-600 mt-1">{signupForm.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...signupForm.register('email')}
                placeholder="john@example.com"
              />
              {signupForm.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">{signupForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                {...signupForm.register('username')}
                placeholder="johndoe"
              />
              {signupForm.formState.errors.username && (
                <p className="text-sm text-red-600 mt-1">{signupForm.formState.errors.username.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...signupForm.register('password')}
                placeholder="••••••••"
              />
              {signupForm.formState.errors.password && (
                <p className="text-sm text-red-600 mt-1">{signupForm.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...signupForm.register('confirmPassword')}
                placeholder="••••••••"
              />
              {signupForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{signupForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? 'Creating Account...' : 'Create Account'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}