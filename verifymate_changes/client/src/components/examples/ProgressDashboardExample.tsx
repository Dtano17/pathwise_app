import ProgressDashboard from '../ProgressDashboard';

export default function ProgressDashboardExample() {
  const sampleData = {
    completedToday: 7,
    totalToday: 10,
    weeklyStreak: 5,
    totalCompleted: 156,
    completionRate: 78,
    categories: [
      { name: 'Health', completed: 3, total: 4 },
      { name: 'Work', completed: 2, total: 3 },
      { name: 'Personal', completed: 2, total: 3 }
    ],
    recentAchievements: [
      '5-day streak', 
      'Health Champion', 
      'Early Bird', 
      'Consistency Master'
    ]
  };

  return <ProgressDashboard data={sampleData} />;
}