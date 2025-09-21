import OpenAI from "openai";
import { type InsertTask } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GoalProcessingResult {
  tasks: Omit<InsertTask, 'userId'>[];
  goalCategory: string;
  goalPriority: 'low' | 'medium' | 'high';
  estimatedTimeframe: string;
}

export class AIService {
  async processGoalIntoTasks(goalText: string): Promise<GoalProcessingResult> {
    try {
      const prompt = `You are an AI productivity assistant. Transform the user's goal or intention into specific, actionable tasks.

User's goal: "${goalText}"

Analyze this goal and respond with JSON in this exact format:
{
  "tasks": [
    {
      "title": "Specific task title",
      "description": "Detailed description of what to do",
      "category": "Category name",
      "priority": "high|medium|low",
      "dueDate": null
    }
  ],
  "goalCategory": "Overall category for the goal",
  "goalPriority": "high|medium|low", 
  "estimatedTimeframe": "Time estimate to complete all tasks"
}

Guidelines:
- Break down complex goals into 2-5 specific, actionable tasks
- Each task should be completable in one session (15 minutes to 2 hours)
- Use clear, action-oriented language ("Do X", "Complete Y", "Practice Z")
- Assign realistic priorities based on urgency and importance
- Categories should be simple: Health, Work, Personal, Learning, Social, Finance, etc.
- For recurring goals (daily habits), create tasks for the next few instances
- Make tasks specific enough that completion is clear and measurable

Examples:
- "Get healthier" → Tasks for meal prep, workout schedule, sleep routine
- "Learn programming" → Tasks for course selection, practice projects, skill assessment
- "Organize life" → Tasks for decluttering spaces, organizing documents, creating systems`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a productivity expert who helps people break down goals into actionable tasks. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate and ensure proper structure
      const processedResult: GoalProcessingResult = {
        tasks: result.tasks?.map((task: any) => ({
          title: task.title || 'Untitled Task',
          description: task.description || 'No description provided',
          category: task.category || result.goalCategory || 'Personal',
          priority: this.validatePriority(task.priority),
          goalId: null,
          completed: false,
          dueDate: task.dueDate ? new Date(task.dueDate) : null
        })) || [],
        goalCategory: result.goalCategory || 'Personal',
        goalPriority: this.validatePriority(result.goalPriority),
        estimatedTimeframe: result.estimatedTimeframe || 'Unknown'
      };

      return processedResult;
    } catch (error) {
      console.error('AI processing failed:', error);
      
      // Fallback to manual task creation
      return this.createFallbackTasks(goalText);
    }
  }

  async generateLifestyleSuggestions(
    completedTasks: string[], 
    categories: { name: string; completed: number; total: number }[],
    streakDays: number
  ): Promise<string[]> {
    try {
      const prompt = `Based on this user's productivity data, suggest 3-4 lifestyle activities or habits that would complement their progress:

Recent completed tasks: ${completedTasks.join(', ')}
Category performance: ${categories.map(c => `${c.name}: ${c.completed}/${c.total}`).join(', ')}
Current streak: ${streakDays} days

Respond with JSON in this format:
{
  "suggestions": ["Activity 1", "Activity 2", "Activity 3", "Activity 4"]
}

Make suggestions that:
- Build on existing momentum
- Address any neglected areas
- Are realistic and actionable
- Enhance overall well-being
- Could be integrated into current routine

Examples: "Try a 10-minute morning meditation", "Take a walk after lunch", "Schedule a weekly phone call with a friend"`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system", 
            content: "You are a wellness coach who provides personalized lifestyle suggestions based on user behavior patterns."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.suggestions || [];
    } catch (error) {
      console.error('Suggestion generation failed:', error);
      return [
        'Take a 5-minute break every hour',
        'Try a new healthy recipe this week',
        'Schedule time for a hobby you enjoy',
        'Connect with a friend or family member'
      ];
    }
  }

  private validatePriority(priority: any): 'low' | 'medium' | 'high' {
    if (priority === 'low' || priority === 'medium' || priority === 'high') {
      return priority;
    }
    return 'medium'; // Default fallback
  }

  private createFallbackTasks(goalText: string): GoalProcessingResult {
    // Simple fallback when AI fails
    const task = {
      title: `Work on: ${goalText}`,
      description: `Take action towards achieving: ${goalText}`,
      category: 'Personal',
      priority: 'medium' as const,
      goalId: null,
      completed: false,
      dueDate: null
    };

    return {
      tasks: [task],
      goalCategory: 'Personal',
      goalPriority: 'medium',
      estimatedTimeframe: '1-2 hours'
    };
  }
}

export const aiService = new AIService();