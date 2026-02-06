import JournalEntry from '../JournalEntry';

export default function JournalEntryExample() {
  const sampleEntry = {
    id: '1',
    date: 'Saturday, September 21, 2024',
    completedTasks: ['Morning workout', 'Drink water', 'Read for 30 minutes'],
    missedTasks: ['Evening walk'],
    reflection: 'Today was productive! I managed to stick to most of my routine. The morning workout gave me great energy for the day. I should try to be more consistent with evening walks.',
    mood: 'good' as const,
    achievements: ['Completed 3/4 tasks', 'Morning routine success']
  };

  const handleSave = (entry: any) => {
    console.log('Journal entry saved:', entry);
  };

  return (
    <JournalEntry 
      entry={sampleEntry}
      onSave={handleSave}
    />
  );
}