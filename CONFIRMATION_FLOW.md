# Plan Confirmation & Refinement Flow

## Overview
After answering all 5 questions (Quick Plan) or 7 questions (Smart Plan), the system now follows a confirmation/refinement flow before showing the "Generate Plan" button.

## Flow Diagram

```
[Answer All Questions]
    ↓
[Show Plan Preview]
    ↓
"Are you comfortable with this plan?"
    ↓
   YES ────→ [Show "Generate Plan" Button] ────→ [Create Activity]
    ↓
    NO
    ↓
"What would you like to add or change?"
    ↓
[User provides 1 change]
    ↓
[Regenerate Plan with Change]
    ↓
"Are you comfortable with this updated plan?"
    ↓
   YES/NO (loop continues)
```

## Example Conversation

### Interview Prep Example

```
User: Help me plan for my disney interview coming up
Bot: Perfect! Just 4 more questions:
     1. What role/position are you interviewing for?
     2. When is the interview scheduled?
     ...

User: This is a technical interview for a streaming data engineering position using scala
Bot: Perfect! Just 1 more question:
     1. When is the interview scheduled?

User: The interview is scheduled on Friday 5pm pst
Bot: [Shows comprehensive interview prep plan with sections for:]
     - Time Available & Strategy
     - Interview Focus Areas
     - Day-by-Day Study Plan
     - Practice Problems & Resources
     - Company Research
     - Behavioral Question Prep
     - Wellness & Day-Of Prep
     - Pro Tips

     ---

     **Are you comfortable with this plan?**

     • Say 'yes' to proceed with generating
     • Say 'no' to make changes

User: no
Bot: No problem! What would you like to add or change?
     (You can also say 'none' if you changed your mind)

User: I want to add more focus on Kafka streaming and system design patterns
Bot: [Shows UPDATED plan with enhanced Kafka/system design sections]

     ---

     **Are you comfortable with this updated plan?**

     • Say 'yes' to proceed with generating
     • Say 'no' to make more changes

User: yes
Bot: Perfect! Click the **Generate Plan** button below to create your actionable plan! 🚀

     [Generate Plan Button appears]
```

## Technical Implementation

### 1. Confirmation Detection
```typescript
private detectConfirmation(message: string): 'yes' | 'no' | null {
  // Detects: yes, yeah, yep, sure, okay, ok, perfect, sounds good, etc.
  // Detects: no, nope, nah, not yet, i want to change, etc.
}
```

### 2. Plan States
- `_planState: 'confirming'` - Showing plan, waiting for yes/no
- `_planState: 'refining'` - User said no, collecting changes
- `_planState: 'confirmed'` - User said yes, ready to generate

### 3. Refinement Storage
```typescript
updatedSlots: {
  ...slots,
  _generatedPlan: enrichedPlan,      // Stores current plan
  _refinements: [...],                // Array of user changes
  _planState: 'confirming'            // Current state
}
```

### 4. Plan Regeneration
When user provides a change:
1. Extract refinement from user message
2. Add to refinements array
3. Pass refinements to `synthesizePlan()`
4. Claude incorporates changes into updated plan
5. Show updated plan with confirmation prompt

## User Commands

### Confirmation
- **Yes**: "yes", "yeah", "yep", "sure", "okay", "ok", "perfect", "sounds good", "looks good", "let's do it", "create it"
- **No**: "no", "nope", "nah", "not yet", "i want to change", "i want to add"

### Refinement
- Provide specific change: "Add more focus on X"
- Multiple changes: Each processed one at a time
- No changes: Say "none" to return to confirmation

## Generate Plan Button
Button appears ONLY when:
1. User has answered all questions
2. Plan has been generated
3. User has confirmed with "yes"
4. `showGenerateButton: true` is returned
5. Routes sets `showCreatePlanButton: true`

## Key Features
✅ No more immediate "Generate Plan" after questions
✅ User reviews plan before committing
✅ One refinement at a time for clarity
✅ Unlimited refinement cycles
✅ "none" option to skip refinements
✅ Clear yes/no prompts
✅ Button appears only after confirmation
