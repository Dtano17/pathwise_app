/**
 * Test script to validate activity copy workflow with task progress preservation
 * 
 * Workflow:
 * 1. Copy shared activity to demo user
 * 2. Complete some tasks (2 out of 5)
 * 3. Modify source activity (update task titles)
 * 4. Re-copy with forceUpdate=true
 * 5. Verify completed tasks are preserved by originalTaskId
 */

async function testCopyWorkflow() {
  const baseUrl = 'http://localhost:5000';
  const shareToken = 'test-share-token-001';
  
  console.log('\n=== ACTIVITY COPY WORKFLOW TEST ===\n');
  
  // Step 1: Initial copy
  console.log('Step 1: Copying shared activity for the first time...');
  const copyResponse1 = await fetch(`${baseUrl}/api/activities/copy/${shareToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });
  const copyData1 = await copyResponse1.json();
  console.log('✓ First copy result:', {
    activityId: copyData1.activity?.id,
    taskCount: copyData1.tasks?.length,
    message: copyData1.message
  });
  
  if (!copyData1.activity) {
    console.error('❌ Failed to copy activity:', copyData1);
    return;
  }
  
  const copiedActivityId = copyData1.activity.id;
  const copiedTasks = copyData1.tasks;
  
  // Step 2: Complete 2 tasks (first and third)
  console.log('\nStep 2: Completing 2 tasks...');
  const tasksToComplete = [copiedTasks[0], copiedTasks[2]];
  
  for (const task of tasksToComplete) {
    const completeResponse = await fetch(`${baseUrl}/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ completed: true })
    });
    const result = await completeResponse.json();
    console.log(`✓ Completed task: ${task.title}`);
  }
  
  // Step 3: Try to copy again (should get conflict)
  console.log('\nStep 3: Attempting to copy again (expecting duplicate detection)...');
  const copyResponse2 = await fetch(`${baseUrl}/api/activities/copy/${shareToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });
  const copyData2 = await copyResponse2.json();
  console.log('✓ Duplicate detection result:', {
    status: copyResponse2.status,
    requiresConfirmation: copyData2.requiresConfirmation,
    error: copyData2.error
  });
  
  // Step 4: Force update
  console.log('\nStep 4: Forcing update with forceUpdate=true...');
  const updateResponse = await fetch(`${baseUrl}/api/activities/copy/${shareToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ forceUpdate: true })
  });
  const updateData = await updateResponse.json();
  console.log('✓ Update result:', {
    activityId: updateData.activity?.id,
    taskCount: updateData.tasks?.length,
    isUpdate: updateData.isUpdate,
    preservedProgress: updateData.preservedProgress,
    message: updateData.message
  });
  
  // Step 5: Verify preservation
  console.log('\nStep 5: Verifying task progress preservation...');
  const verifyResponse = await fetch(`${baseUrl}/api/activities/${updateData.activity.id}`, {
    credentials: 'include'
  });
  const verifyData = await verifyResponse.json();
  
  console.log('\nTask preservation analysis:');
  verifyData.tasks.forEach((task: any, index: number) => {
    const wasOriginallyCompleted = tasksToComplete.some(t => 
      t.originalTaskId === task.originalTaskId || 
      t.id === task.originalTaskId ||
      t.title.toLowerCase() === task.title.toLowerCase()
    );
    console.log(`  ${index + 1}. ${task.title}`);
    console.log(`     - Completed: ${task.completed ? '✓' : '✗'}`);
    console.log(`     - Original ID: ${task.originalTaskId}`);
    console.log(`     - Expected: ${wasOriginallyCompleted ? 'completed' : 'not completed'}`);
    console.log(`     - Status: ${task.completed === wasOriginallyCompleted ? '✓ CORRECT' : '✗ MISMATCH'}`);
  });
  
  // Step 6: Check archived activity
  console.log('\nStep 6: Checking archived activities...');
  const historyResponse = await fetch(`${baseUrl}/api/activities/history`, {
    credentials: 'include'
  });
  const historyData = await historyResponse.json();
  console.log('✓ Archived activities count:', historyData.length);
  if (historyData.length > 0) {
    console.log('  Latest archived activity:', {
      id: historyData[0].id,
      title: historyData[0].title,
      isArchived: historyData[0].isArchived
    });
  }
  
  console.log('\n=== TEST COMPLETE ===\n');
}

// Run test
testCopyWorkflow().catch(console.error);
