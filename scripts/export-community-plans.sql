-- Community Plans Export
-- Generated: 2025-11-09T14:04:02.385Z
-- Total Plans: 25
--
-- Instructions:
-- 1. Open your Production Database in Replit
-- 2. Copy this entire file
-- 3. Paste and execute in the SQL query panel
-- 4. Refresh your Discover Plans page
--

-- Start transaction
BEGIN;

-- Create community user if not exists
INSERT INTO users (id, username, email, source, first_name, last_name)
VALUES (
  'community-plans-user',
  'community',
  'community@journalmate.demo',
  'manual',
  'Community',
  'Creator'
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Weekend Trip to Paris
-- Category: travel | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  '400ed634-ccb3-4abf-8736-94f5431e0562',
  'community-plans-user',
  'Weekend Trip to Paris',
  'Complete 3-day Paris itinerary with sights, dining, and Eiffel Tower visit',
  'travel',
  NULL,
  NULL,
  '[]',
  'Romantic 3-day Paris escape with iconic landmarks, French cuisine, and evening river cruise',
  true,
  '69ffe9bcd54aaeeca475b95dffe5c737',
  NULL,
  NULL,
  '["travel","paris","europe","weekend","romantic"]',
  'Weekend Trip to Paris',
  'romantic_paris_citys_dfc7c798.jpg',
  NULL,
  2400,
  2400,
  4800,
  true,
  'Sarah Chen',
  NULL,
  NULL,
  NULL,
  '[]',
  'completed',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:16.269Z',
  '2025-11-05T23:22:16.269Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Weekend Trip to Paris
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '57367f84-234d-4e58-956d-905f7ae73c74',
  '400ed634-ccb3-4abf-8736-94f5431e0562',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:16.409Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'd728913a-ce71-4551-b560-9584049f3147',
  '400ed634-ccb3-4abf-8736-94f5431e0562',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:16.547Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '36ae2219-8a63-470d-9ee3-a081f7648017',
  '400ed634-ccb3-4abf-8736-94f5431e0562',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:16.684Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'ff02da83-78ef-49f1-86c5-3fc0e9c55923',
  '400ed634-ccb3-4abf-8736-94f5431e0562',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:16.820Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '853fe266-c232-49cc-b56f-54a424fca62c',
  '400ed634-ccb3-4abf-8736-94f5431e0562',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:16.954Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: 30-Day Fitness Challenge
-- Category: health | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'a8b60c94-856c-4e4c-b5d9-86c430009ee3',
  'community-plans-user',
  '30-Day Fitness Challenge',
  'Daily workouts, meal prep, and progress tracking for complete transformation',
  'health',
  NULL,
  NULL,
  '[]',
  'Structured 30-day fitness program with workouts, nutrition plan, and accountability tracking',
  true,
  '4db96c313d6051c7333fa296b1d7bdfe',
  NULL,
  NULL,
  '["fitness","health","workout","challenge","30days"]',
  '30-Day Fitness Challenge',
  'fitness_workout_gym__2325ee98.jpg',
  NULL,
  1800,
  1800,
  3600,
  true,
  'Mike Johnson',
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:17.022Z',
  '2025-11-05T23:22:17.022Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: 30-Day Fitness Challenge
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'f08b47ff-2286-4f3e-abea-feee137c2187',
  'a8b60c94-856c-4e4c-b5d9-86c430009ee3',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:17.160Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'd583b1fc-c129-4be3-9ad7-cae841fb6f00',
  'a8b60c94-856c-4e4c-b5d9-86c430009ee3',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:17.293Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '2a25abda-5877-4ff8-8e3f-dc5bb6b217d7',
  'a8b60c94-856c-4e4c-b5d9-86c430009ee3',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:17.426Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '597933c8-36f0-4567-9ace-ae4f94c5c98a',
  'a8b60c94-856c-4e4c-b5d9-86c430009ee3',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:17.563Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '1f5a1358-b638-43c1-837d-004227721701',
  'a8b60c94-856c-4e4c-b5d9-86c430009ee3',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:17.831Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Daily Meditation Practice
-- Category: health | Tasks: 7
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'c12c2ac9-de47-4d7b-9e4c-9d7d37bf79d9',
  'community-plans-user',
  'Daily Meditation Practice',
  '30-day mindfulness program to reduce stress and improve mental clarity',
  'health',
  NULL,
  NULL,
  '[]',
  'Progressive meditation guide from 5-minute sessions to 20-minute daily practice with breath work',
  true,
  '9781b395310e5cafb0b69a01c47dfdd2',
  NULL,
  NULL,
  '["meditation","mindfulness","mental-health","wellness","stress-relief"]',
  'Daily Meditation Practice',
  'person_meditating_pe_43f13693.jpg',
  NULL,
  1650,
  1650,
  3300,
  true,
  'Maya Patel',
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:17.898Z',
  '2025-11-05T23:22:17.898Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Daily Meditation Practice
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '468b097b-318a-4dde-952e-dcc41d42baf5',
  'c12c2ac9-de47-4d7b-9e4c-9d7d37bf79d9',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:18.031Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '852d6c53-7099-4132-8a39-9c83ded09b96',
  'c12c2ac9-de47-4d7b-9e4c-9d7d37bf79d9',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:18.166Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '95c27b2e-4695-40ab-99e5-308dfd6b9e4f',
  'c12c2ac9-de47-4d7b-9e4c-9d7d37bf79d9',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:18.301Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '730f71de-b760-48fb-b55d-ae778336b4ce',
  'c12c2ac9-de47-4d7b-9e4c-9d7d37bf79d9',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:18.434Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'cb68f50b-51a2-4e91-a71e-ae23a0d4e5d3',
  'c12c2ac9-de47-4d7b-9e4c-9d7d37bf79d9',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:18.568Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '67759cf9-4a00-40ba-a607-2caf704b8b4c',
  'c12c2ac9-de47-4d7b-9e4c-9d7d37bf79d9',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:18.701Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'b058f965-170b-4cba-8065-648f88310513',
  'c12c2ac9-de47-4d7b-9e4c-9d7d37bf79d9',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:18.836Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Career Switch to Tech
-- Category: career | Tasks: 7
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'ebf01aad-99f8-43b0-9e0b-2c5eb08db474',
  'community-plans-user',
  'Career Switch to Tech',
  '6-month plan: coding bootcamp, portfolio projects, and job applications',
  'career',
  NULL,
  NULL,
  '[]',
  'Comprehensive career transition roadmap from non-tech to software development role',
  true,
  'a5bef837601f776f6c51920d997b0901',
  NULL,
  NULL,
  '["career","tech","coding","bootcamp","transition"]',
  'Career Switch to Tech',
  'professional_develop_960cd8cf.jpg',
  NULL,
  1500,
  1500,
  3000,
  true,
  'Alex Kim',
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:19.638Z',
  '2025-11-05T23:22:19.638Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Career Switch to Tech
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '9547272d-1df5-487e-ace1-c2b81772aa72',
  'ebf01aad-99f8-43b0-9e0b-2c5eb08db474',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:19.773Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'ced314c9-e30e-4158-b185-13c4708f792c',
  'ebf01aad-99f8-43b0-9e0b-2c5eb08db474',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:19.906Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '64b10772-a4b3-4c3c-9723-b34524db1161',
  'ebf01aad-99f8-43b0-9e0b-2c5eb08db474',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:20.042Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'fe243e9e-d162-41da-9f5f-4f509fa0da34',
  'ebf01aad-99f8-43b0-9e0b-2c5eb08db474',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:20.176Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '798998cd-11a6-45f3-9968-f132ee36be9d',
  'ebf01aad-99f8-43b0-9e0b-2c5eb08db474',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:20.310Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '9c3c8cee-4cd5-49e6-9765-2606daa32020',
  'ebf01aad-99f8-43b0-9e0b-2c5eb08db474',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:20.443Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '378b92eb-a8b5-439e-be2b-a05fa1cf0078',
  'ebf01aad-99f8-43b0-9e0b-2c5eb08db474',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:20.579Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Home Renovation Project
-- Category: home | Tasks: 7
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'd0c59fd3-e5c4-41f3-994f-9adaddc7a31d',
  'community-plans-user',
  'Home Renovation Project',
  'Complete kitchen remodel timeline with contractor coordination and budget',
  'home',
  NULL,
  NULL,
  '[]',
  'Step-by-step kitchen renovation with contractor management and budget control',
  true,
  'fdc67a424a745a1df6c047940e7c8d52',
  NULL,
  NULL,
  '["home","renovation","remodel","diy","kitchen"]',
  'Home Renovation Project',
  'modern_kitchen_renov_a5563863.jpg',
  NULL,
  2100,
  2100,
  4200,
  true,
  'John Smith',
  NULL,
  NULL,
  NULL,
  '[]',
  'planning',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:20.646Z',
  '2025-11-05T23:22:20.646Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Home Renovation Project
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '7f32b04a-4e87-420e-8088-f176b62baebd',
  'd0c59fd3-e5c4-41f3-994f-9adaddc7a31d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:20.787Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'f0035f31-8404-4be8-9b59-e1f3c58441a2',
  'd0c59fd3-e5c4-41f3-994f-9adaddc7a31d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:20.921Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'c9fb1de1-d304-491f-9610-ad8d7aa78681',
  'd0c59fd3-e5c4-41f3-994f-9adaddc7a31d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:21.055Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '24a3ff90-ed68-4438-9e31-cd08f5af1ee7',
  'd0c59fd3-e5c4-41f3-994f-9adaddc7a31d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:21.193Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '6acbe970-ffc4-4107-be88-a8d793ad2994',
  'd0c59fd3-e5c4-41f3-994f-9adaddc7a31d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:21.329Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'a0d7f142-916a-4f7e-a6ef-83e1693b5a79',
  'd0c59fd3-e5c4-41f3-994f-9adaddc7a31d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:21.462Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '9078e351-aee9-4238-ae73-e1d6084684d2',
  'd0c59fd3-e5c4-41f3-994f-9adaddc7a31d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:21.595Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Digital Nomad Guide to Bali
-- Category: travel | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  '5e9b8609-27f3-4bad-917e-0f04429fe6d5',
  'community-plans-user',
  'Digital Nomad Guide to Bali',
  'Remote work paradise: visa, coworking spaces, best neighborhoods, and scooter rentals',
  'travel',
  NULL,
  NULL,
  '[]',
  'Complete guide for remote workers relocating to Bali with workspace, visa, and living tips',
  true,
  '6462eb7b1ca8bc9fe213a66f1672d3cc',
  NULL,
  NULL,
  '["travel","bali","digital-nomad","remote-work","asia"]',
  'Digital Nomad Guide to Bali',
  'bali_indonesia_tropi_95575be5.jpg',
  NULL,
  1950,
  1650,
  3600,
  true,
  'Jordan Rivera',
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:22.406Z',
  '2025-11-05T23:22:22.406Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Digital Nomad Guide to Bali
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '58a58117-d4ce-4af2-abfc-18f1295a0a32',
  '5e9b8609-27f3-4bad-917e-0f04429fe6d5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:22.539Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'b3117a34-9b1f-45d0-896e-78cc738f6ea8',
  '5e9b8609-27f3-4bad-917e-0f04429fe6d5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:22.673Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '8924cb35-472a-4cd1-acc2-a09669ddcbba',
  '5e9b8609-27f3-4bad-917e-0f04429fe6d5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:22.806Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '53200e26-517c-472b-b880-5c21204b9b6e',
  '5e9b8609-27f3-4bad-917e-0f04429fe6d5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:22.945Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'dfaa54ab-55de-4d99-9759-f821b82c13f6',
  '5e9b8609-27f3-4bad-917e-0f04429fe6d5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:23.084Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Launch Your Side Hustle
-- Category: work | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  '85882062-8839-41be-bc86-559ed7de8eb6',
  'community-plans-user',
  'Launch Your Side Hustle',
  'Validate idea, build MVP, get first 10 customers in 90 days',
  'work',
  NULL,
  NULL,
  '[]',
  'Practical startup framework from idea validation to revenue generation in 3 months',
  true,
  '242c6ca0b62d34fbb2df2908316915cc',
  NULL,
  NULL,
  '["entrepreneurship","startup","side-hustle","business","revenue"]',
  'Launch Your Side Hustle',
  'modern_workspace_des_9f6c2608.jpg',
  NULL,
  1750,
  1500,
  3250,
  true,
  'Priya Sharma',
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:24.628Z',
  '2025-11-05T23:22:24.628Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Launch Your Side Hustle
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '7db568f5-911e-4a3f-a94b-b04deed0e6b3',
  '85882062-8839-41be-bc86-559ed7de8eb6',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:24.761Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '3087dcd2-dbc1-4a03-888d-f4cdd70a4f1a',
  '85882062-8839-41be-bc86-559ed7de8eb6',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:24.892Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '7b4de4f6-068e-41e1-9e2f-76f4a05c1189',
  '85882062-8839-41be-bc86-559ed7de8eb6',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:25.298Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '2c81e5e0-483d-40e8-a19b-20e8c9ec059a',
  '85882062-8839-41be-bc86-559ed7de8eb6',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:25.430Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '8e17a3eb-9e9a-4ef3-8dd8-8e1be7ea5526',
  '85882062-8839-41be-bc86-559ed7de8eb6',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:25.157Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Tokyo Adventure: 7-Day Itinerary
-- Category: travel | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  '4d37bf04-f636-4894-a806-4b16c1e36565',
  'community-plans-user',
  'Tokyo Adventure: 7-Day Itinerary',
  'Shibuya crossing, Mt. Fuji day trip, ramen tours, and hidden temples',
  'travel',
  NULL,
  NULL,
  '[]',
  'Week-long Tokyo exploration blending modern culture, traditional sites, and culinary experiences',
  true,
  'bb5c863ec43172f9c11efd27f0a15f98',
  NULL,
  NULL,
  '["travel","tokyo","japan","culture","food"]',
  'Tokyo Adventure: 7-Day Itinerary',
  'tokyo_japan_travel_d_8a196170.jpg',
  NULL,
  3401,
  2900,
  9201,
  true,
  'Kenji Tanaka',
  NULL,
  NULL,
  NULL,
  '[]',
  'planning',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:23.884Z',
  '2025-11-05T23:27:28.688Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Tokyo Adventure: 7-Day Itinerary
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'e62627d8-c2d2-47e1-b1ab-69d54fd95112',
  '4d37bf04-f636-4894-a806-4b16c1e36565',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:24.019Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'aad89c50-7dfb-45fb-91ca-15bad470daeb',
  '4d37bf04-f636-4894-a806-4b16c1e36565',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:24.156Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'e7d50e24-499d-4e5c-99e7-4178d387ccc7',
  '4d37bf04-f636-4894-a806-4b16c1e36565',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:24.296Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '3f19e4da-73b5-429e-98a4-ff7d0d708648',
  '4d37bf04-f636-4894-a806-4b16c1e36565',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:24.428Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '79bb96ef-bc70-430b-807b-b92fa6c6725e',
  '4d37bf04-f636-4894-a806-4b16c1e36565',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:24.561Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Wedding Planning Checklist
-- Category: personal | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'e123942d-5f97-41eb-9a3d-d26fc9774bc5',
  'community-plans-user',
  'Wedding Planning Checklist',
  '12-month wedding plan with venue, vendors, guests, and timeline',
  'personal',
  NULL,
  NULL,
  '[]',
  'Complete wedding planning guide covering venue booking, vendor selection, and timeline management',
  true,
  '14f5ce3761b050a98a8c178700741a79',
  NULL,
  NULL,
  '["wedding","planning","events","checklist","celebration"]',
  'Wedding Planning Checklist',
  'elegant_wedding_cere_9aa2c585.jpg',
  NULL,
  3203,
  3200,
  9603,
  true,
  'Emma Davis',
  NULL,
  NULL,
  NULL,
  '[]',
  'planning',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:18.906Z',
  '2025-11-06T07:27:25.442Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Wedding Planning Checklist
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '3d775e14-8cb2-4a7f-bc50-22e09fbc6637',
  'e123942d-5f97-41eb-9a3d-d26fc9774bc5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:19.039Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'e680dcb9-c3fc-40eb-97cd-d8359a8c55ef',
  'e123942d-5f97-41eb-9a3d-d26fc9774bc5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:19.172Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '2e91d0d6-24a1-4dac-a851-fb6a6995ec6a',
  'e123942d-5f97-41eb-9a3d-d26fc9774bc5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:19.305Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'b7b1e535-a342-4980-9f3d-52c7ffc716ff',
  'e123942d-5f97-41eb-9a3d-d26fc9774bc5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:19.439Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '47bd9015-b013-4a03-b2dd-cf8d1f7bffb2',
  'e123942d-5f97-41eb-9a3d-d26fc9774bc5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:19.571Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Marathon Training: 16-Week Plan
-- Category: health | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'eb6c1520-af75-4783-8f1f-064164ee0050',
  'community-plans-user',
  'Marathon Training: 16-Week Plan',
  'First-time marathoner? Build endurance from 5K to 26.2 miles with injury prevention',
  'health',
  NULL,
  NULL,
  '[]',
  'Structured 16-week training program with progressive mileage, nutrition, and recovery strategies',
  true,
  '83d84936677e3611177340208f1d530b',
  NULL,
  NULL,
  '["fitness","running","marathon","training","endurance"]',
  'Marathon Training: 16-Week Plan',
  'runner_jogging_on_tr_9a63ddad.jpg',
  NULL,
  2851,
  2400,
  7651,
  true,
  'Rachel Martinez',
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:23.152Z',
  '2025-11-06T06:35:35.650Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Marathon Training: 16-Week Plan
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'a9edb42a-9fad-4a98-8e3b-a6abb9637491',
  'eb6c1520-af75-4783-8f1f-064164ee0050',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:23.287Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'c5f55ee3-3eb2-4139-983d-b8006d966324',
  'eb6c1520-af75-4783-8f1f-064164ee0050',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:23.420Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '486073dc-f833-4438-a19a-a6474a71071f',
  'eb6c1520-af75-4783-8f1f-064164ee0050',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:23.552Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'cd23d2ec-3916-4e20-ade5-5e6dc46d8c27',
  'eb6c1520-af75-4783-8f1f-064164ee0050',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:23.685Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'c4a57f4d-11f4-4816-8a5c-3a65687ffbd5',
  'eb6c1520-af75-4783-8f1f-064164ee0050',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:23.818Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: NYC Holiday Magic: Christmas Week
-- Category: travel | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  '44859b30-d821-451c-be2c-01e341cc6ff8',
  'community-plans-user',
  'NYC Holiday Magic: Christmas Week',
  'Rockefeller tree, ice skating, Broadway shows, and holiday markets',
  'travel',
  NULL,
  NULL,
  '[]',
  'Festive New York City experience with iconic holiday traditions and winter activities',
  true,
  '40ba737bdfd16f0f46101b7526746e81',
  NULL,
  NULL,
  '["travel","nyc","christmas","holiday","winter"]',
  'NYC Holiday Magic: Christmas Week',
  'new_york_city_times__e09e766b.jpg',
  NULL,
  2650,
  2200,
  4850,
  true,
  'Amanda Collins',
  NULL,
  NULL,
  NULL,
  '[]',
  'planning',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:26.281Z',
  '2025-11-05T23:22:26.281Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: NYC Holiday Magic: Christmas Week
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'bf5d0bdb-2dcc-4543-b7ab-c2c891d9f408',
  '44859b30-d821-451c-be2c-01e341cc6ff8',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:26.418Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'bc78c1be-94c4-4e23-b4a5-ad08a5e44133',
  '44859b30-d821-451c-be2c-01e341cc6ff8',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:26.552Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'c7e8562a-4c5a-46d4-b960-594b13ac1ea6',
  '44859b30-d821-451c-be2c-01e341cc6ff8',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:26.685Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '6a375c24-0d8b-4cfd-a88d-7b92c2cca6ed',
  '44859b30-d821-451c-be2c-01e341cc6ff8',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:26.818Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '60003104-f65d-4ed9-9d43-b846b90f3911',
  '44859b30-d821-451c-be2c-01e341cc6ff8',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:26.951Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Mindfulness & Meditation Practice
-- Category: health | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  '6d3dd2e6-cec2-455d-9a7e-285b9b0038d3',
  'community-plans-user',
  'Mindfulness & Meditation Practice',
  '21-day habit builder with guided sessions, breathwork, and journaling',
  'health',
  NULL,
  NULL,
  '[]',
  'Structured meditation program for beginners to establish daily mindfulness routine',
  true,
  '3074a74ad7b6d0cca45ac0c19ee2b05a',
  NULL,
  NULL,
  '["mindfulness","meditation","mental-health","wellness","habit"]',
  'Mindfulness & Meditation Practice',
  'yoga_studio_peaceful_84f9a366.jpg',
  NULL,
  1580,
  1320,
  2900,
  true,
  'Elena Rodriguez',
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:27.018Z',
  '2025-11-05T23:22:27.018Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Mindfulness & Meditation Practice
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'f687c1a5-628a-464f-b768-967d7835f8c0',
  '6d3dd2e6-cec2-455d-9a7e-285b9b0038d3',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:27.154Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '4f7aaffc-918f-480a-8f80-963ef066324b',
  '6d3dd2e6-cec2-455d-9a7e-285b9b0038d3',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:27.289Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'db676b57-863a-4b46-97e5-fe42f0cf0483',
  '6d3dd2e6-cec2-455d-9a7e-285b9b0038d3',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:27.422Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'a85126ff-c46d-40d5-ac14-a23f276456a2',
  '6d3dd2e6-cec2-455d-9a7e-285b9b0038d3',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:27.554Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '514398a0-5b58-44b6-923f-61d580349d94',
  '6d3dd2e6-cec2-455d-9a7e-285b9b0038d3',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:27.690Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Iceland Northern Lights Expedition
-- Category: travel | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  '403fc443-1f08-409e-888c-e1a9a76fae9e',
  'community-plans-user',
  'Iceland Northern Lights Expedition',
  'Chase aurora borealis, explore ice caves, and relax in Blue Lagoon',
  'travel',
  NULL,
  NULL,
  '[]',
  '5-day Iceland adventure focusing on Northern Lights photography and natural wonders',
  true,
  'dda69999a674c99b668c00e12e72aa23',
  NULL,
  NULL,
  '["travel","iceland","northern-lights","adventure","photography"]',
  'Iceland Northern Lights Expedition',
  'iceland_northern_lig_9fbbf14d.jpg',
  NULL,
  2190,
  1850,
  4040,
  true,
  'Stefan Olafsson',
  NULL,
  NULL,
  NULL,
  '[]',
  'planning',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:27.756Z',
  '2025-11-05T23:22:27.756Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Iceland Northern Lights Expedition
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '297f3fd7-15ad-4c69-a711-432b9016dfac',
  '403fc443-1f08-409e-888c-e1a9a76fae9e',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:27.888Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'e22be91e-a4ed-456f-aaad-e697973308a3',
  '403fc443-1f08-409e-888c-e1a9a76fae9e',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:28.021Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '876bf28f-5d0e-41a3-81a9-f974d04adb03',
  '403fc443-1f08-409e-888c-e1a9a76fae9e',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:28.155Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '759ff9da-9de4-447b-9400-4a8f224c707e',
  '403fc443-1f08-409e-888c-e1a9a76fae9e',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:28.289Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'df25f4d5-c2fc-473e-8ab6-681346ff3902',
  '403fc443-1f08-409e-888c-e1a9a76fae9e',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:28.431Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Learn Spanish in 90 Days
-- Category: learning | Tasks: 7
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  '41b3213b-7161-4d1a-b92b-bfc46a9ef180',
  'community-plans-user',
  'Learn Spanish in 90 Days',
  'Daily practice schedule, vocabulary building, and conversation practice',
  'learning',
  NULL,
  NULL,
  '[]',
  'Immersive Spanish learning program with daily practice and real conversation partners',
  true,
  'cf2d7fad6bc41731d0ced786e0308b7c',
  NULL,
  NULL,
  '["learning","spanish","language","education","practice"]',
  'Learn Spanish in 90 Days',
  'spanish_language_lea_269b1aa7.jpg',
  NULL,
  1200,
  1200,
  2400,
  true,
  'Lisa Garcia',
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:29.229Z',
  '2025-11-05T23:22:29.229Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Learn Spanish in 90 Days
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'c88562db-de3c-4a5f-8821-63036d46699e',
  '41b3213b-7161-4d1a-b92b-bfc46a9ef180',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:29.364Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '9f5483f4-7fec-4c0c-8e04-1cff4e62ffa9',
  '41b3213b-7161-4d1a-b92b-bfc46a9ef180',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:29.498Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '1bb360ad-3c9c-47a5-972b-64d5687384a5',
  '41b3213b-7161-4d1a-b92b-bfc46a9ef180',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:29.632Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'afc1e8da-8799-4239-8fea-576a685dcfaa',
  '41b3213b-7161-4d1a-b92b-bfc46a9ef180',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:29.765Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '866c6655-58eb-412a-9725-528cd737d370',
  '41b3213b-7161-4d1a-b92b-bfc46a9ef180',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:29.897Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'f56f88d5-a728-4598-82ef-013027de4cb3',
  '41b3213b-7161-4d1a-b92b-bfc46a9ef180',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:30.029Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '51002e7d-9980-452f-adf1-f6911fb7e2ca',
  '41b3213b-7161-4d1a-b92b-bfc46a9ef180',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:30.162Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Strength Training for Beginners
-- Category: health | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'cbad8ec1-f7f9-4867-a0db-0cafb65d76d8',
  'community-plans-user',
  'Strength Training for Beginners',
  '8-week progressive overload program with compound movements',
  'health',
  NULL,
  NULL,
  '[]',
  'Science-based strength program teaching squat, deadlift, bench press, and overhead press fundamentals',
  true,
  'faad6ac8c96109a7afdfdbf049f2d023',
  NULL,
  NULL,
  '["fitness","strength-training","gym","muscle","beginner"]',
  'Strength Training for Beginners',
  'modern_gym_workout_w_99dc5406.jpg',
  NULL,
  2050,
  1750,
  3800,
  true,
  'Chris Anderson',
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:30.228Z',
  '2025-11-05T23:22:30.228Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Strength Training for Beginners
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'ce7253fd-7ee9-4e93-99b2-bba7c66c1e56',
  'cbad8ec1-f7f9-4867-a0db-0cafb65d76d8',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:30.362Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '7b68873c-1f47-49ec-a570-82aba629ed6b',
  'cbad8ec1-f7f9-4867-a0db-0cafb65d76d8',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:30.496Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '1e90a110-1da1-4b91-9486-86e159129229',
  'cbad8ec1-f7f9-4867-a0db-0cafb65d76d8',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:30.629Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '459b8037-2364-4afc-911c-7dff76fad358',
  'cbad8ec1-f7f9-4867-a0db-0cafb65d76d8',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:30.763Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '73ce4bf1-9d5d-4ee1-872b-3e1a7928328c',
  'cbad8ec1-f7f9-4867-a0db-0cafb65d76d8',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:30.895Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Professional Networking Strategy
-- Category: work | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'c0aff071-a39b-4455-b6c3-03161ab172f5',
  'community-plans-user',
  'Professional Networking Strategy',
  'Build genuine relationships, attend industry events, and grow LinkedIn presence',
  'work',
  NULL,
  NULL,
  '[]',
  '90-day networking plan to expand professional connections and unlock career opportunities',
  true,
  '5e33ccd70e991092ab63be7a9f7c4a9a',
  NULL,
  NULL,
  '["networking","career","linkedin","professional-development","relationships"]',
  'Professional Networking Strategy',
  'professional_network_48ccc448.jpg',
  NULL,
  1450,
  1200,
  2650,
  true,
  'Jennifer Wong',
  NULL,
  NULL,
  NULL,
  '[]',
  'planning',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:30.961Z',
  '2025-11-05T23:22:30.961Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Professional Networking Strategy
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '9b29195f-4535-40c6-8315-afd21bb36e1a',
  'c0aff071-a39b-4455-b6c3-03161ab172f5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:31.096Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '7dc9a4e8-8ac9-4da8-86df-d435f2b0225e',
  'c0aff071-a39b-4455-b6c3-03161ab172f5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:31.229Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '075cec78-b2c5-4fce-95f5-17e31d89db80',
  'c0aff071-a39b-4455-b6c3-03161ab172f5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:31.362Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '16975e88-93f7-4cfc-8b67-d2c4a1f6529d',
  'c0aff071-a39b-4455-b6c3-03161ab172f5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:31.495Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'f45815e8-4e12-4fa3-b37b-ab96e171a812',
  'c0aff071-a39b-4455-b6c3-03161ab172f5',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:31.630Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Personal Reading Challenge: 52 Books
-- Category: personal | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'abe72429-a26a-4d00-9d2d-621ebec9b19f',
  'community-plans-user',
  'Personal Reading Challenge: 52 Books',
  'One book per week with diverse genres, discussion groups, and reflection journal',
  'personal',
  NULL,
  NULL,
  '[]',
  'Year-long reading habit with curated book list, tracking system, and community engagement',
  true,
  '763d3701799ae0f22035447769b11ed6',
  NULL,
  NULL,
  '["reading","books","personal-growth","learning","habit"]',
  'Personal Reading Challenge: 52 Books',
  'person_reading_book__bc916131.jpg',
  NULL,
  1680,
  1400,
  3080,
  true,
  'Olivia Brown',
  NULL,
  NULL,
  NULL,
  '[]',
  'active',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:31.697Z',
  '2025-11-05T23:22:31.697Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Personal Reading Challenge: 52 Books
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '45c66e13-90b1-4cac-92d4-ad1b2f287bf2',
  'abe72429-a26a-4d00-9d2d-621ebec9b19f',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:31.834Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '06032a49-9d44-46f6-8900-12d53f9fe996',
  'abe72429-a26a-4d00-9d2d-621ebec9b19f',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:31.968Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '6f2dd439-aa0e-430c-9cce-e00c3d38bbef',
  'abe72429-a26a-4d00-9d2d-621ebec9b19f',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:32.099Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '99d8e12a-536f-41c7-8a59-7e8bf68bae1d',
  'abe72429-a26a-4d00-9d2d-621ebec9b19f',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:32.230Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '63e3948b-89f3-44e8-8749-a04e28bc5fae',
  'abe72429-a26a-4d00-9d2d-621ebec9b19f',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:32.362Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Epic Birthday Party: 30th Celebration
-- Category: personal | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'a3879206-c0f1-465e-b41a-e6d80fea61ed',
  'community-plans-user',
  'Epic Birthday Party: 30th Celebration',
  'Venue, theme, guest list, catering, entertainment, and surprise moments',
  'personal',
  NULL,
  NULL,
  '[]',
  'Complete party planning guide for milestone birthday with 50-80 guests',
  true,
  'f4862a2d3dcc8c942ac00eb496a46ce9',
  NULL,
  NULL,
  '["birthday","party","celebration","event-planning","milestone"]',
  'Epic Birthday Party: 30th Celebration',
  'birthday_party_celeb_414d649e.jpg',
  NULL,
  1890,
  1600,
  3490,
  true,
  'Michael Torres',
  NULL,
  NULL,
  NULL,
  '[]',
  'planning',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:32.429Z',
  '2025-11-05T23:22:32.429Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Epic Birthday Party: 30th Celebration
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '543d0c82-6048-4552-908b-8239bda4a4a5',
  'a3879206-c0f1-465e-b41a-e6d80fea61ed',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:32.561Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '413c4360-c4b3-4f72-b3d2-fe1c1932581d',
  'a3879206-c0f1-465e-b41a-e6d80fea61ed',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:32.695Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '14d0ba9f-d140-4cac-8adf-58a3f94b9c56',
  'a3879206-c0f1-465e-b41a-e6d80fea61ed',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:32.829Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '12140a36-29c1-41f7-b299-6e90bd9ceaaf',
  'a3879206-c0f1-465e-b41a-e6d80fea61ed',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:32.964Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'aadffcfb-73d8-43be-a0e6-71280fe4c060',
  'a3879206-c0f1-465e-b41a-e6d80fea61ed',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:33.097Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Music Festival Survival Guide
-- Category: personal | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'f3f9c976-e423-453f-8839-f45a9805504d',
  'community-plans-user',
  'Music Festival Survival Guide',
  'Packing list, camping setup, schedule planning, and festival hacks',
  'personal',
  NULL,
  NULL,
  '[]',
  'Complete preparation guide for multi-day music festival with camping tips and safety essentials',
  true,
  '6a6dfaf7b57df1578311ffbc16953e5c',
  NULL,
  NULL,
  '["festival","music","camping","travel","events"]',
  'Music Festival Survival Guide',
  'concert_music_festiv_18316657.jpg',
  NULL,
  2340,
  1950,
  4290,
  true,
  'Sophie Anderson',
  NULL,
  NULL,
  NULL,
  '[]',
  'planning',
  NULL,
  false,
  NULL,
  false,
  '2025-11-05T23:22:33.165Z',
  '2025-11-05T23:22:33.165Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Music Festival Survival Guide
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '64cccdd3-7da5-44aa-bd0e-8170c4797b46',
  'f3f9c976-e423-453f-8839-f45a9805504d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:33.297Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'c7823056-1614-488d-ab2e-99c030d69793',
  'f3f9c976-e423-453f-8839-f45a9805504d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:33.430Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '64ee7190-3aa3-437f-936a-e8c003e2c34b',
  'f3f9c976-e423-453f-8839-f45a9805504d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:33.564Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '5172259f-b418-43f6-9219-d29d9d3e01f3',
  'f3f9c976-e423-453f-8839-f45a9805504d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:33.697Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'd6277f68-dd20-4d01-b77a-062a4226bf52',
  'f3f9c976-e423-453f-8839-f45a9805504d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-05T23:22:33.831Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: 🏖️ Miami Beach Week: Ultimate Coastal Escape
-- Category: travel | Tasks: 10
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'ce398b8d-2e63-4a03-bb36-f0a67b60fe74',
  'community-plans-user',
  '🏖️ Miami Beach Week: Ultimate Coastal Escape',
  'Experience the best of Miami Beach with sun, surf, nightlife, and incredible dining',
  'travel',
  NULL,
  NULL,
  '[]',
  'A week-long adventure exploring Miami''s beaches, nightlife, water sports, dining scene, and cultural attractions. Includes South Beach, Wynwood, Little Havana, and island adventures.',
  true,
  '91fbc06ca58e98bca824894b40f91953',
  NULL,
  NULL,
  '[]',
  '🏖️ Miami Beach Week: Ultimate Coastal Escape',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95',
  NULL,
  0,
  0,
  0,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  '[]',
  'in-progress',
  NULL,
  false,
  NULL,
  false,
  '2025-11-08T23:02:22.070Z',
  '2025-11-08T23:02:22.070Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: 🏖️ Miami Beach Week: Ultimate Coastal Escape
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'f11fa58a-fd14-41c3-9c45-d439784fb235',
  'ce398b8d-2e63-4a03-bb36-f0a67b60fe74',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:08.793Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '849fe99c-14a5-406d-999f-76760fd8aa6f',
  'ce398b8d-2e63-4a03-bb36-f0a67b60fe74',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:08.793Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'd7604c7c-3005-424b-8fdf-059c2ce79f9b',
  'ce398b8d-2e63-4a03-bb36-f0a67b60fe74',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:08.793Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '3f576f7a-3aa9-45e3-89a5-171b485d316c',
  'ce398b8d-2e63-4a03-bb36-f0a67b60fe74',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:08.793Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '488359f8-10ff-4f62-953b-5d7a411c7cd4',
  'ce398b8d-2e63-4a03-bb36-f0a67b60fe74',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:08.793Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '007cd49c-c360-4705-ae91-491164bec603',
  'ce398b8d-2e63-4a03-bb36-f0a67b60fe74',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:08.793Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '46a77363-4773-42cc-bef3-72113488db7c',
  'ce398b8d-2e63-4a03-bb36-f0a67b60fe74',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:08.793Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '00f04d83-4fa6-4a39-b5d1-f9d40635f7bd',
  'ce398b8d-2e63-4a03-bb36-f0a67b60fe74',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:08.793Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '98c1b348-eaeb-4ccc-a1d9-4452aeea5a15',
  'ce398b8d-2e63-4a03-bb36-f0a67b60fe74',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:08.793Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'f46a95fe-bb21-4805-92bc-3bb7120b8db0',
  'ce398b8d-2e63-4a03-bb36-f0a67b60fe74',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:08.793Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: Romantic Lagos Escape: 2-Week Journey
-- Category: personal | Tasks: 5
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  '3d6b28d7-69ae-4681-b71c-9a570a4e48d6',
  'community-plans-user',
  'Romantic Lagos Escape: 2-Week Journey',
  'Explore the vibrant city of Lagos with your partner, enjoying cultural sites, romantic dinners, and relaxing experiences.',
  'personal',
  NULL,
  NULL,
  '[]',
  NULL,
  true,
  '08aad32852d543808146e2ec4b34e0d0',
  NULL,
  '✨ Check out my Romantic Lagos Escape: 2-Week Journey!

Explore the vibrant city of Lagos with your partner, enjoying cultural sites, romantic dinners, and relaxing experiences.
Track progress, own and edit your own version!

⭐ 0% complete with 5 tasks!

👉',
  '[]',
  NULL,
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
  NULL,
  0,
  0,
  0,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  '[]',
  'planning',
  NULL,
  false,
  NULL,
  false,
  '2025-10-24T10:52:34.588Z',
  '2025-11-09T01:35:38.059Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: Romantic Lagos Escape: 2-Week Journey
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '0fb9b6e2-1b17-4510-a7dd-9c586bd6fda9',
  '3d6b28d7-69ae-4681-b71c-9a570a4e48d6',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-10-24T10:52:34.765Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '44a67f48-25ad-4e3e-9501-428c0b487f7c',
  '3d6b28d7-69ae-4681-b71c-9a570a4e48d6',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-10-24T10:52:34.919Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'ef0431ed-7a96-4fb2-85b5-5c9ca84d4759',
  '3d6b28d7-69ae-4681-b71c-9a570a4e48d6',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-10-24T10:52:35.053Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '70d5f7f5-48a0-4b87-9940-59c68b6db0d8',
  '3d6b28d7-69ae-4681-b71c-9a570a4e48d6',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-10-24T10:52:35.187Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '8a7de651-7eb1-4a99-974e-da04ffe14e89',
  '3d6b28d7-69ae-4681-b71c-9a570a4e48d6',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-10-24T10:52:35.320Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: 🌺 Hawaiian Paradise: Island Adventure
-- Category: travel | Tasks: 10
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'd97edb7a-91d3-438f-b8c8-2264e9129c1d',
  'community-plans-user',
  '🌺 Hawaiian Paradise: Island Adventure',
  'Explore volcanoes, pristine beaches, tropical rainforests, and authentic Hawaiian culture',
  'travel',
  NULL,
  NULL,
  '[]',
  'An unforgettable Hawaiian journey featuring volcano hikes, world-class snorkeling, traditional luaus, surfing lessons, and hidden waterfall discoveries across the islands.',
  true,
  '8ea60578de5b480f75dffe7c570301f8',
  NULL,
  NULL,
  '[]',
  '🌺 Hawaiian Paradise: Island Adventure',
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=95',
  NULL,
  0,
  0,
  0,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  '[]',
  'planning',
  NULL,
  false,
  NULL,
  false,
  '2025-11-08T23:02:22.161Z',
  '2025-11-08T23:02:22.161Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: 🌺 Hawaiian Paradise: Island Adventure
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'dc6c09b9-1f25-4ec1-a419-5ed0b0fdd201',
  'd97edb7a-91d3-438f-b8c8-2264e9129c1d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:24.659Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '329fbdd8-1709-4449-932b-d638d944b494',
  'd97edb7a-91d3-438f-b8c8-2264e9129c1d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:24.659Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'b0228a34-8d6e-466b-ba96-53a07966f577',
  'd97edb7a-91d3-438f-b8c8-2264e9129c1d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:24.659Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '9620e1e5-bb6b-46f8-a25b-dd4ba6a1493c',
  'd97edb7a-91d3-438f-b8c8-2264e9129c1d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:24.659Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '101a3dcd-307d-489a-999f-76fa661d4d0f',
  'd97edb7a-91d3-438f-b8c8-2264e9129c1d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:24.659Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'b75d3ce9-25b7-4e73-8385-6a1f4abbc366',
  'd97edb7a-91d3-438f-b8c8-2264e9129c1d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:24.659Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '1fa56ac2-78a1-4322-bd77-63480c478713',
  'd97edb7a-91d3-438f-b8c8-2264e9129c1d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:24.659Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '153c5736-2627-4401-bce0-319317cf0c3c',
  'd97edb7a-91d3-438f-b8c8-2264e9129c1d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:24.659Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'd3548321-3951-407c-9801-6d590eb1f2d3',
  'd97edb7a-91d3-438f-b8c8-2264e9129c1d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:24.659Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '803b4ac7-b6bc-4a99-9ca2-3ca9512eefe9',
  'd97edb7a-91d3-438f-b8c8-2264e9129c1d',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:24.659Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: 🎄 NYC Holiday Magic: Winter Wonderland
-- Category: travel | Tasks: 10
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  'b873a43c-1753-4cea-8490-4193f804cdcc',
  'community-plans-user',
  '🎄 NYC Holiday Magic: Winter Wonderland',
  'Experience the magic of New York City during the most wonderful time of the year',
  'travel',
  NULL,
  NULL,
  '[]',
  'A festive NYC adventure including ice skating at Rockefeller Center, Broadway shows, holiday markets, world-class dining, and iconic museum visits during the holiday season.',
  true,
  '43465c458d79047644a741dce7ac0aed',
  NULL,
  NULL,
  '[]',
  '🎄 NYC Holiday Magic: Winter Wonderland',
  'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=1920&q=95',
  NULL,
  0,
  0,
  0,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  '[]',
  'in-progress',
  NULL,
  false,
  NULL,
  false,
  '2025-11-08T23:02:22.228Z',
  '2025-11-08T23:02:22.228Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: 🎄 NYC Holiday Magic: Winter Wonderland
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'b76eb37b-f46f-4693-a2f9-fb1b487026d9',
  'b873a43c-1753-4cea-8490-4193f804cdcc',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:35.244Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'bd132939-e711-4a80-8564-3778b4dcd245',
  'b873a43c-1753-4cea-8490-4193f804cdcc',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:35.244Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '9aea494a-c027-458c-bd8e-efc7a7f0f33a',
  'b873a43c-1753-4cea-8490-4193f804cdcc',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:35.244Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '34d98724-6768-4eb9-8a9c-678d8acf8a7f',
  'b873a43c-1753-4cea-8490-4193f804cdcc',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:35.244Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'a7c99039-ba8f-4bf5-8fdf-a3544eacd4a1',
  'b873a43c-1753-4cea-8490-4193f804cdcc',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:35.244Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '25fa2f42-f8fc-42fb-8608-f7a4b84c97fa',
  'b873a43c-1753-4cea-8490-4193f804cdcc',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:35.244Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '142d471c-1eab-4c5c-a896-a4c6cba3a4b7',
  'b873a43c-1753-4cea-8490-4193f804cdcc',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:35.244Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'ffa7dea4-92a0-4a30-b5f7-bb50e85ef2b1',
  'b873a43c-1753-4cea-8490-4193f804cdcc',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:35.244Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '743c50a1-047b-474a-b84a-5f32a19924a0',
  'b873a43c-1753-4cea-8490-4193f804cdcc',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:35.244Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'a58ca004-179d-475b-addd-5aad3866691a',
  'b873a43c-1753-4cea-8490-4193f804cdcc',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:35.244Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: ⛷️ Colorado Mountain Retreat: Ski & Relax
-- Category: travel | Tasks: 10
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  '4d58699c-802e-40bb-9b2b-7f14d14fcd43',
  'community-plans-user',
  '⛷️ Colorado Mountain Retreat: Ski & Relax',
  'Hit the slopes, soak in hot springs, and enjoy mountain luxury in the Colorado Rockies',
  'travel',
  NULL,
  NULL,
  '[]',
  'A thrilling Colorado ski adventure featuring world-class skiing, natural hot springs, mountain dining, snowshoeing, and après-ski experiences in the stunning Rocky Mountains.',
  true,
  '7683b7df1b57d6e5efdad1e9de6c247a',
  NULL,
  NULL,
  '[]',
  '⛷️ Colorado Mountain Retreat: Ski & Relax',
  'https://images.unsplash.com/photo-1551524164-687a55dd1126?w=1920&q=95',
  NULL,
  0,
  0,
  0,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  '[]',
  'planning',
  NULL,
  false,
  NULL,
  false,
  '2025-11-08T23:02:22.293Z',
  '2025-11-08T23:02:22.293Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: ⛷️ Colorado Mountain Retreat: Ski & Relax
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '4882367f-99c9-496f-b368-5851406a46a6',
  '4d58699c-802e-40bb-9b2b-7f14d14fcd43',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:51.117Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '915a9e3c-ba27-4f52-895a-4e5a782474b4',
  '4d58699c-802e-40bb-9b2b-7f14d14fcd43',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:51.117Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '0b1e6c2b-0650-4900-b814-1b19946bdbde',
  '4d58699c-802e-40bb-9b2b-7f14d14fcd43',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:51.117Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '2ed2ce51-e3b0-4e6e-b735-c982288b8df8',
  '4d58699c-802e-40bb-9b2b-7f14d14fcd43',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:51.117Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '573a29f8-a4d5-48b8-a051-8a97dd764f11',
  '4d58699c-802e-40bb-9b2b-7f14d14fcd43',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:51.117Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '37c0d983-7df0-4217-857b-1173dfcccfbf',
  '4d58699c-802e-40bb-9b2b-7f14d14fcd43',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:51.117Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'dac64604-f0e7-4734-b70b-50208b9382ee',
  '4d58699c-802e-40bb-9b2b-7f14d14fcd43',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:51.117Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'de4d7759-5855-43a9-b792-29ed09420dc0',
  '4d58699c-802e-40bb-9b2b-7f14d14fcd43',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:51.117Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '57a7336f-be97-482b-8132-88ffa56f32cc',
  '4d58699c-802e-40bb-9b2b-7f14d14fcd43',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:51.117Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'c3c51008-a740-40d9-98ef-ab5c8037c6e1',
  '4d58699c-802e-40bb-9b2b-7f14d14fcd43',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:03:51.117Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Activity: 🗼 Tokyo Discovery: Modern Meets Traditional
-- Category: travel | Tasks: 10
INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  '2e42ea79-ab60-4f27-86c6-d03e0813fab2',
  'community-plans-user',
  '🗼 Tokyo Discovery: Modern Meets Traditional',
  'Immerse yourself in Tokyo''s unique blend of ancient temples and cutting-edge technology',
  'travel',
  NULL,
  NULL,
  '[]',
  'A comprehensive Tokyo experience featuring ancient temples, authentic ramen tours, high-tech districts, serene gardens, vibrant nightlife, and cultural landmarks.',
  true,
  '6aab6248f7d3853636570830d7c28de9',
  NULL,
  NULL,
  '[]',
  '🗼 Tokyo Discovery: Modern Meets Traditional',
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1920&q=95',
  NULL,
  0,
  0,
  0,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  '[]',
  'in-progress',
  NULL,
  false,
  NULL,
  false,
  '2025-11-08T23:02:22.358Z',
  '2025-11-08T23:02:22.358Z'
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

-- Tasks for: 🗼 Tokyo Discovery: Modern Meets Traditional
INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '57d2301d-344e-414e-a7e5-4647fbee1690',
  '2e42ea79-ab60-4f27-86c6-d03e0813fab2',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:04:01.356Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'b1253e23-15cc-4113-a447-d4ad345912ab',
  '2e42ea79-ab60-4f27-86c6-d03e0813fab2',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:04:01.356Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '949be0a4-e023-443a-909e-9b4da10275cb',
  '2e42ea79-ab60-4f27-86c6-d03e0813fab2',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:04:01.356Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '539a7616-0f23-457a-8b28-628e0f172143',
  '2e42ea79-ab60-4f27-86c6-d03e0813fab2',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:04:01.356Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '491d9a78-bfe5-488d-b1cf-b0255e10d5cd',
  '2e42ea79-ab60-4f27-86c6-d03e0813fab2',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:04:01.356Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '643be2d5-41da-4e66-ac28-c41797c74d1a',
  '2e42ea79-ab60-4f27-86c6-d03e0813fab2',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:04:01.356Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'ba5012cf-5480-439b-a8cd-8540de0886d2',
  '2e42ea79-ab60-4f27-86c6-d03e0813fab2',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:04:01.356Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '5af3df7e-423d-4cc6-bfcc-81acbb22aea3',
  '2e42ea79-ab60-4f27-86c6-d03e0813fab2',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:04:01.356Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  '86d23bbc-fb1c-40ff-8916-fb9c5996dcc2',
  '2e42ea79-ab60-4f27-86c6-d03e0813fab2',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:04:01.356Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  'a089ec4f-5974-409f-bdb7-effda8e55b4b',
  '2e42ea79-ab60-4f27-86c6-d03e0813fab2',
  'community-plans-user',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  '2025-11-08T23:04:01.356Z',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- Commit transaction
COMMIT;

-- Verify import
SELECT 
  COUNT(*) as total_plans,
  COUNT(DISTINCT category) as categories
FROM activities
WHERE featured_in_community = true;

-- Done! Your community plans are now in production 🎉
