import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, CheckCircle, X, Edit, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface JournalEntryData {
  id: string;
  date: string;
  completedTasks: string[];
  missedTasks: string[];
  reflection: string;
  mood: 'great' | 'good' | 'okay' | 'poor';
  achievements: string[];
}

interface JournalEntryProps {
  entry?: JournalEntryData;
  onSave: (entry: Omit<JournalEntryData, 'id'>) => void;
  isEditing?: boolean;
}

export default function JournalEntry({ entry, onSave, isEditing = false }: JournalEntryProps) {
  const [editing, setEditing] = useState(isEditing);
  const [reflection, setReflection] = useState(entry?.reflection || '');
  const [mood, setMood] = useState<'great' | 'good' | 'okay' | 'poor'>(entry?.mood || 'good');

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const handleSave = () => {
    const newEntry = {
      date: entry?.date || today,
      completedTasks: entry?.completedTasks || [],
      missedTasks: entry?.missedTasks || [],
      reflection,
      mood,
      achievements: entry?.achievements || [],
    };
    
    onSave(newEntry);
    setEditing(false);
  };

  const moodColors = {
    great: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    good: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    okay: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    poor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const moodEmojis = {
    great: '😄',
    good: '😊',
    okay: '😐',
    poor: '😔',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="max-w-2xl mx-auto hover-elevate" data-testid="card-journal-entry">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Daily Journal
            </CardTitle>
            {!editing && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEditing(true)}
                data-testid="button-edit-journal"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{entry?.date || today}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Task Summary */}
          {(entry?.completedTasks.length || entry?.missedTasks.length) && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Task Summary</h4>
              
              {entry?.completedTasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Completed</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.completedTasks.map((task, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {task}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {entry?.missedTasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Missed</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.missedTasks.map((task, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {task}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mood Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">How was your day?</h4>
            <div className="flex gap-2">
              {(['great', 'good', 'okay', 'poor'] as const).map((moodOption) => (
                <Button
                  key={moodOption}
                  variant={mood === moodOption ? "default" : "outline"}
                  size="sm"
                  onClick={() => editing && setMood(moodOption)}
                  disabled={!editing}
                  className={`gap-2 ${mood === moodOption ? moodColors[moodOption] : ''}`}
                  data-testid={`button-mood-${moodOption}`}
                >
                  <span>{moodEmojis[moodOption]}</span>
                  <span className="capitalize">{moodOption}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Reflection */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Reflection</h4>
            {editing ? (
              <Textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="How did today go? What did you learn? What would you do differently?"
                className="min-h-[120px] resize-none"
                data-testid="textarea-reflection"
              />
            ) : (
              <div className="p-3 bg-muted rounded-md min-h-[120px] text-muted-foreground">
                {reflection || "No reflection added yet..."}
              </div>
            )}
          </div>

          {/* Achievements */}
          {entry?.achievements && entry.achievements.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Today's Achievements</h4>
              <div className="flex flex-wrap gap-2">
                {entry.achievements.map((achievement, index) => (
                  <Badge key={index} className="bg-primary/10 text-primary">
                    🏆 {achievement}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          {editing && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="gap-2" data-testid="button-save-journal">
                <Save className="w-4 h-4" />
                Save Entry
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditing(false)}
                data-testid="button-cancel-journal"
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}