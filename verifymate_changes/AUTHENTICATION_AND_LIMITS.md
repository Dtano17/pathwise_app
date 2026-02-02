# Authentication & Activity Limits

## Non-Authenticated Users: Single Activity Limit

### Rules

**Non-authenticated (guest) users can:**
- ✅ Create and track **ONE activity** with unlimited tasks
- ✅ Use full conversational planning (quick or smart plan)
- ✅ Edit, complete, and delete tasks within their activity
- ✅ See progress tracking and completion percentages

**To create more activities, users must sign in to:**
- ✅ Create **unlimited activities**
- ✅ Share activities with friends
- ✅ Let friends view or contribute to activities
- ✅ Track progress across devices
- ✅ Set reminders and notifications
- ✅ Sync with calendar
- ✅ Export plans
- ✅ Access activity history

---

## Implementation

### 1. Backend Check (server/routes.ts)

```typescript
app.post('/api/planning/message', async (req, res) => {
  const { message, planMode } = req.body;
  const user = req.user || req.session.guestUser;

  // Check if user can create more activities
  if (!req.isAuthenticated()) {
    const existingActivities = await storage.getActivitiesByUser(user.id);

    if (existingActivities.length >= 1) {
      return res.json({
        error: 'activity_limit_reached',
        message: "You've reached the limit for guest users (1 activity). Sign in to create unlimited activities!",
        showSignupPrompt: true,
        features: [
          'Create unlimited activities',
          'Share activities with friends',
          'Track progress across devices',
          'Set reminders and notifications',
          'Collaborate with others',
          'Access activity history'
        ]
      });
    }
  }

  // Continue with normal flow
  const result = await langGraphPlanningAgent.processMessage(
    user.id,
    message,
    user,
    req.session.conversationHistory || [],
    storage,
    planMode
  );

  res.json(result);
});
```

### 2. Frontend Signup Prompt (SignupPromptModal.tsx)

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface SignupPromptProps {
  isOpen: boolean;
  onClose: () => void;
  features: string[];
}

export function SignupPromptModal({ isOpen, onClose, features }: SignupPromptProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            🎉 Activity Limit Reached!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-center text-muted-foreground">
            You've created your first activity! Sign in to unlock more features:
          </p>

          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Continue as Guest
            </Button>
            <Button
              className="flex-1"
              onClick={() => window.location.href = '/auth/login'}
            >
              Sign In
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Don't have an account?{' '}
            <a href="/auth/register" className="text-primary hover:underline">
              Create one free
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Integration in VoiceInput.tsx

```typescript
import { SignupPromptModal } from './SignupPromptModal';

export function VoiceInput() {
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [signupFeatures, setSignupFeatures] = useState<string[]>([]);

  const sendMessage = async (message: string) => {
    const response = await fetch('/api/planning/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, planMode: 'quick' })
    });

    const data = await response.json();

    // Check if activity limit reached
    if (data.error === 'activity_limit_reached') {
      setSignupFeatures(data.features);
      setShowSignupPrompt(true);

      // Show the message in chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message
      }]);

      return;
    }

    // Normal flow
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.message,
      createdActivity: data.createdActivity
    }]);
  };

  return (
    <>
      {/* Chat interface */}
      <div>...</div>

      {/* Signup prompt modal */}
      <SignupPromptModal
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        features={signupFeatures}
      />
    </>
  );
}
```

---

## User Experience Flow

### Scenario 1: Guest User Creates First Activity

```
User: "Help plan my trip to Dallas"
    ↓
LangGraph: Asks questions, gathers info
    ↓
User: Provides all information
    ↓
LangGraph: Creates activity automatically ✅
    ↓
User sees: "✨ Activity Created! Your 'Dallas Weekend' is ready!"
    ↓
User can: Track tasks, mark complete, edit, etc.
```

### Scenario 2: Guest User Tries to Create Second Activity

```
User: "Help plan my interview prep"
    ↓
Backend: Checks activity count
    ↓
Count: 1 activity exists (limit reached for guests)
    ↓
Response: {
  error: 'activity_limit_reached',
  showSignupPrompt: true,
  features: [...]
}
    ↓
Frontend: Shows modal popup:

┌─────────────────────────────────────────────┐
│   🎉 Activity Limit Reached!                │
├─────────────────────────────────────────────┤
│                                             │
│  You've created your first activity!        │
│  Sign in to unlock more features:           │
│                                             │
│  ✓ Create unlimited activities              │
│  ✓ Share activities with friends            │
│  ✓ Track progress across devices            │
│  ✓ Set reminders and notifications          │
│  ✓ Collaborate with others                  │
│  ✓ Access activity history                  │
│                                             │
│  [Continue as Guest]  [Sign In]             │
│                                             │
│  Don't have an account? Create one free     │
└─────────────────────────────────────────────┘
```

### Scenario 3: Authenticated User Creates Multiple Activities

```
User (signed in): "Help plan my trip to Dallas"
    ↓
LangGraph: Creates activity ✅
    ↓
User (signed in): "Help plan my interview prep"
    ↓
Backend: Checks authentication → Authenticated ✅
    ↓
LangGraph: Creates second activity ✅
    ↓
User (signed in): "Help plan my fitness routine"
    ↓
LangGraph: Creates third activity ✅
    ↓
...unlimited activities...
```

---

## Database Schema

### Guest User Management

```typescript
// When guest visits without account
const guestUser = await storage.createGuestUser({
  username: `guest_${randomId()}`,
  email: null,
  isGuest: true,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
});

// Store in session
req.session.guestUser = guestUser;
```

### Activity Ownership

```sql
-- Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255),
  description TEXT,
  category VARCHAR(50),
  status VARCHAR(20),
  is_guest BOOLEAN DEFAULT FALSE,  -- Track guest-created activities
  created_at TIMESTAMP,
  expires_at TIMESTAMP              -- For guest activities (7 days)
);

-- Check activity count
SELECT COUNT(*) FROM activities
WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW());
```

---

## Migration Path: Guest → Authenticated

### When Guest Signs Up

```typescript
app.post('/auth/register', async (req, res) => {
  const guestUserId = req.session.guestUser?.id;

  // Create new authenticated user
  const newUser = await storage.createUser({
    email: req.body.email,
    password: hashedPassword,
    username: req.body.username
  });

  // Migrate guest activities to new user
  if (guestUserId) {
    await storage.migrateGuestActivities(guestUserId, newUser.id);
  }

  req.session.guestUser = null;
  req.login(newUser, ...);
});
```

```typescript
// storage.ts
async migrateGuestActivities(guestUserId: number, newUserId: number) {
  await db.execute(
    `UPDATE activities
     SET user_id = ?, is_guest = FALSE, expires_at = NULL
     WHERE user_id = ? AND is_guest = TRUE`,
    [newUserId, guestUserId]
  );

  await db.execute(
    `UPDATE tasks
     SET user_id = ?
     WHERE user_id = ?`,
    [newUserId, guestUserId]
  );

  console.log(`Migrated guest activities from ${guestUserId} to ${newUserId}`);
}
```

---

## Feature Comparison Table

| Feature | Guest User | Authenticated User |
|---------|------------|-------------------|
| **Activities** | 1 activity | ✅ Unlimited |
| **Tasks per Activity** | ✅ Unlimited | ✅ Unlimited |
| **Quick Plan** | ✅ Yes | ✅ Yes |
| **Smart Plan** | ✅ Yes | ✅ Yes |
| **Task Editing** | ✅ Yes | ✅ Yes |
| **Progress Tracking** | ✅ Yes | ✅ Yes |
| **Share with Friends** | ❌ No | ✅ Yes |
| **Collaborative Editing** | ❌ No | ✅ Yes |
| **Cross-Device Sync** | ❌ No | ✅ Yes |
| **Reminders** | ❌ No | ✅ Yes |
| **Calendar Export** | ❌ No | ✅ Yes |
| **Activity History** | ❌ No | ✅ Yes |
| **Data Persistence** | 7 days | ✅ Forever |

---

## UI/UX Considerations

### 1. **Show Activity Count in UI**

```tsx
// Header component
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  {!isAuthenticated && (
    <>
      <span>Activities: {activityCount}/1</span>
      <Button size="sm" variant="outline" onClick={handleSignIn}>
        Sign in for unlimited
      </Button>
    </>
  )}
</div>
```

### 2. **Proactive Signup Hints**

```tsx
// After creating first activity as guest
<Alert className="mt-4">
  <Info className="h-4 w-4" />
  <AlertTitle>Enjoying your first plan?</AlertTitle>
  <AlertDescription>
    Sign in to create unlimited activities, share with friends, and never lose your progress!
    <Button size="sm" className="mt-2" onClick={handleSignIn}>
      Create Free Account
    </Button>
  </AlertDescription>
</Alert>
```

### 3. **Delete Activity to Create New One (Guest Workaround)**

```tsx
// If guest wants to create new activity
<Alert variant="destructive">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Activity Limit Reached</AlertTitle>
  <AlertDescription>
    You can delete your existing activity to create a new one, or sign in for unlimited activities.
    <div className="flex gap-2 mt-2">
      <Button size="sm" variant="destructive" onClick={handleDeleteActivity}>
        Delete Existing Activity
      </Button>
      <Button size="sm" onClick={handleSignIn}>
        Sign In Instead
      </Button>
    </div>
  </AlertDescription>
</Alert>
```

---

## Summary

### ✅ Non-Authenticated Users
- Can create **1 activity** with **unlimited tasks**
- Full access to conversational planning (quick & smart)
- Data persists for **7 days**
- Can **migrate to full account** by signing in

### ✅ Authenticated Users
- **Unlimited activities**
- **Unlimited tasks**
- All sharing and collaboration features
- Data persists **forever**
- Cross-device sync
- Reminders and notifications

### ✅ Signup Prompt
- Shows **exactly when limit is reached**
- Lists **clear benefits** of signing in
- Offers **"Continue as Guest"** option (can delete existing activity)
- **Non-intrusive** - only shows when needed
- **Conversion-focused** - clear value proposition

This approach maximizes trial usage while incentivizing signup! 🚀
