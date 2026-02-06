import GoalInput from '../GoalInput';

export default function GoalInputExample() {
  const sampleCategories = ['Health', 'Work', 'Personal', 'Learning', 'Social'];

  const handleAddGoal = (goal: any) => {
    console.log('New goal added:', goal);
  };

  return (
    <GoalInput 
      onAddGoal={handleAddGoal}
      categories={sampleCategories}
    />
  );
}