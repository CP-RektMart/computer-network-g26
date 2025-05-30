-- -- Delete existing data (maintain foreign key integrity)
-- DELETE FROM "GroupMessage";
-- DELETE FROM "GroupMember";
-- DELETE FROM "Group";
-- DELETE FROM "User";

-- -- Insert 5 users
-- INSERT INTO "User" ("id","username","email","password","salt","createdAt") VALUES
--   (1, 'alice', 'alice@example.com', 'hashedpassword1', 'salt1', NOW()),
--   (2, 'bob', 'bob@example.com', 'hashedpassword2', 'salt2', NOW()),
--   (3, 'charlie', 'charlie@example.com', 'hashedpassword3', 'salt3', NOW()),
--   (4, 'dave', 'dave@example.com', 'hashedpassword4', 'salt4', NOW()),
--   (5, 'eve', 'eve@example.com', 'hashedpassword5', 'salt5', NOW());

-- SELECT * FROM "User";

-- -- Insert 2 groups
-- INSERT INTO "Group" ("id","name","createdAt") VALUES
-- 	(1,'Group 1', NOW()),
-- 	(2,'Group 2',NOW());

-- SELECT * FROM "Group";

-- --- Insert 5 GroupMember 
-- INSERT INTO "GroupMember" ("userId","groupId","role","joinedAt") VALUES
-- (1,1,'member', '2025-04-08 10:41:41'),
-- (2,1,'member', '2025-04-08 10:41:41'),
-- (3,1,'member', '2025-04-08 10:41:41'),
-- (3,2,'member', '2025-04-08 10:41:41'),
-- (4,2,'member', '2025-04-08 10:41:41'),
-- (5,2,'member', '2025-04-08 10:41:41');

-- SELECT * FROM "GroupMember";

-- INSERT INTO "GroupMessage" ("userId", "groupId", "content", "sentAt") VALUES
-- (1, 1, '{"type": "text", "text": "Hey everyone, can someone share the updated report?"}', '2025-04-08 10:40:01'),
-- (3, 1, '{"type": "text", "text": "Let me know if anyone has any questions regarding the latest project."}', '2025-04-08 10:40:20'),
-- (3, 1, '{"type": "text", "text": "Can we reschedule the meeting to tomorrow?"}', '2025-04-08 10:40:40'),
-- (1, 1, '{"type": "text", "text": "Here’s the link to the document I was talking about earlier."}', '2025-04-08 10:41:00'),
-- (1, 1, '{"type": "text", "text": "Please check the attachment for the updated slides."}', '2025-04-08 10:41:20'),
-- (3, 1, '{"type": "text", "text": "I just pushed the code to the repository. Let me know if you face any issues."}', '2025-04-08 10:41:40'),
-- (1, 1, '{"type": "text", "text": "Does anyone have updates for the client meeting?"}', '2025-04-08 10:42:00'),
-- (2, 1, '{"type": "text", "text": "The project is progressing well, but we need more feedback."}', '2025-04-08 10:42:20'),
-- (3, 1, '{"type": "text", "text": "Can someone send the final version of the proposal?"}', '2025-04-08 10:43:20'),
-- (2, 1, '{"type": "text", "text": "I’ll be out of the office for the next hour, but will catch up later."}', '2025-04-08 10:43:40'),
-- (1, 1, '{"type": "text", "text": "Has everyone submitted their progress reports?"}', '2025-04-08 10:44:20'),
-- (1, 1, '{"type": "text", "text": "The meeting has been rescheduled to Friday, please update your calendars."}', '2025-04-08 10:45:00'),
-- (3, 1, '{"type": "text", "text": "Can we have a quick check-in to go over the tasks?"}', '2025-04-08 10:46:20'),
-- (1, 1, '{"type": "text", "text": "We need to finalize the design before the end of the week."}', '2025-04-08 10:47:00'),
-- (3, 1, '{"type": "text", "text": "Great work on the design, just a few tweaks needed."}', '2025-04-08 10:47:20'),
-- (1, 1, '{"type": "text", "text": "I’ve updated the task list, check the project management tool."}', '2025-04-08 10:47:40'),
-- (2, 1, '{"type": "text", "text": "Can you confirm if the client received the report?"}', '2025-04-08 10:48:00'),
-- (1, 1, '{"type": "text", "text": "Looking forward to the meeting tomorrow. Let me know if anything needs to be added to the agenda."}', '2025-04-08 10:48:40'),
-- (2, 1, '{"type": "text", "text": "The testing phase has begun, and everything seems to be on track."}', '2025-04-08 10:49:00'),
-- (1, 1, '{"type": "text", "text": "I’ll be out of the office for the afternoon, feel free to contact me via email."}', '2025-04-08 10:51:00'),
-- (2, 1, '{"type": "text", "text": "I’ve added the new features to the product. Can you check them?"}', '2025-04-08 10:51:20'),
-- (1, 1, '{"type": "text", "text": "The meeting is scheduled for 2 PM, please be on time."}', '2025-04-08 10:52:00'),
-- (3, 1, '{"type": "text", "text": "I need feedback on the new features by tomorrow."}', '2025-04-08 10:52:20'),
-- (2, 1, '{"type": "text", "text": "We need to check the new builds before going live."}', '2025-04-08 10:52:40'),
-- (1, 1, '{"type": "text", "text": "I’ve completed the feature implementation. Let’s test it now."}', '2025-04-08 10:53:40'),
-- (2, 1, '{"type": "text", "text": "Let’s aim to finish the sprint by the end of the week."}', '2025-04-08 10:54:00'),
-- (3, 1, '{"type": "text", "text": "I’ll be reviewing the code during the next few hours."}', '2025-04-08 10:54:20'),
-- (1, 1, '{"type": "text", "text": "Please remember to update your progress in the system."}', '2025-04-08 10:54:40'),
-- (2, 1, '{"type": "text", "text": "Does anyone need assistance with the new deployment?"}', '2025-04-08 10:55:00'),
-- (1, 1, '{"type": "text", "text": "I’ll send a reminder about the upcoming deadlines."}', '2025-04-08 10:55:20'),
-- (3, 1, '{"type": "text", "text": "Is there a status update on the client’s feedback?"}', '2025-04-08 10:55:40'),
-- (2, 1, '{"type": "text", "text": "Can we schedule a meeting to review the new features?"}', '2025-04-08 10:56:00'),
-- (3, 1, '{"type": "text", "text": "I’ll be unavailable for the next few hours."}', '2025-04-08 10:56:20'),
-- (1, 1, '{"type": "text", "text": "I’ve attached the final proposal for review."}', '2025-04-08 10:56:40'),
-- (2, 1, '{"type": "text", "text": "I’ve finished reviewing the code, let me know if you have any concerns."}', '2025-04-08 10:57:00'),
-- (1, 1, '{"type": "text", "text": "Please review the updated version of the presentation."}', '2025-04-08 10:57:20'),
-- (3, 1, '{"type": "text", "text": "I’ll be working on bug fixes over the next hour."}', '2025-04-08 10:57:40'),
-- (2, 1, '{"type": "text", "text": "Let’s have a quick meeting to address the current challenges."}', '2025-04-08 10:58:00'),
-- (1, 1, '{"type": "text", "text": "I’ve updated the feature list, please have a look."}', '2025-04-08 10:58:20'),
-- (3, 1, '{"type": "text", "text": "Can we prioritize the critical issues for this sprint?"}', '2025-04-08 10:58:40'),
-- (2, 1, '{"type": "text", "text": "The client requested a few changes to the deliverables."}', '2025-04-08 10:59:00'),
-- (1, 1, '{"type": "text", "text": "We need to prepare the marketing materials for the product launch."}', '2025-04-08 10:59:20'),
-- (3, 1, '{"type": "text", "text": "I’ll be reviewing the pull requests shortly."}', '2025-04-08 10:59:40'),
-- (1, 1, '{"type": "text", "text": "Could everyone confirm their availability for a meeting later today?"}', '2025-04-08 11:00:00'),
-- (2, 1, '{"type": "text", "text": "Please provide your feedback on the latest UI design."}', '2025-04-08 11:00:20'),
-- (1, 1, '{"type": "text", "text": "Can someone take care of the testing for the new feature?"}', '2025-04-08 11:00:40'),
-- (2, 1, '{"type": "text", "text": "I’ve completed the database migration, please verify."}', '2025-04-08 11:01:00'),
-- (3, 1, '{"type": "text", "text": "We need to finalize the API documentation."}', '2025-04-08 11:01:20'),
-- (1, 1, '{"type": "text", "text": "Can you confirm if the server is running smoothly?"}', '2025-04-08 11:01:40'),
-- (2, 1, '{"type": "text", "text": "I’m checking the system logs for any issues."}', '2025-04-08 11:02:00'),
-- (1, 1, '{"type": "text", "text": "Please provide an update on the project status."}', '2025-04-08 11:02:20'),
-- (3, 1, '{"type": "text", "text": "The system performance seems to be improving after the recent changes."}', '2025-04-08 11:02:40'),
-- (2, 1, '{"type": "text", "text": "I’m pushing the final changes to production."}', '2025-04-08 11:03:00'),
-- (1, 1, '{"type": "text", "text": "Let’s review the new feature during the meeting later."}', '2025-04-08 11:03:20'),
-- (2, 1, '{"type": "text", "text": "I’ll update the documentation to reflect the new features."}', '2025-04-08 11:03:40'),
-- (3, 1, '{"type": "text", "text": "We need to conduct a code review before the release."}', '2025-04-08 11:04:00'),
-- (1, 1, '{"type": "text", "text": "Has anyone received feedback from the client?"}', '2025-04-08 11:04:20'),
-- (3, 1, '{"type": "text", "text": "I’ll send a reminder to the team about the project deadline."}', '2025-04-08 11:04:40'),
-- (2, 1, '{"type": "text", "text": "We need to confirm the deployment schedule."}', '2025-04-08 11:05:00'),
-- (1, 1, '{"type": "text", "text": "Can we go over the tasks during the meeting?"}', '2025-04-08 11:05:20'),
-- (2, 1, '{"type": "text", "text": "I’ll review the codebase for any potential issues."}', '2025-04-08 11:05:40'),
-- (3, 1, '{"type": "text", "text": "Let me know if you encounter any problems with the system."}', '2025-04-08 11:06:00'),
-- (1, 1, '{"type": "text", "text": "Please make sure to update the project board with your progress."}', '2025-04-08 11:06:20'),
-- (2, 1, '{"type": "text", "text": "I’m finalizing the presentation for the meeting."}', '2025-04-08 11:06:40'),
-- (3, 1, '{"type": "text", "text": "I’ll be reviewing the final drafts of the documentation."}', '2025-04-08 11:07:00'),
-- (1, 1, '{"type": "text", "text": "Let’s have a follow-up meeting after lunch to discuss the next steps."}', '2025-04-08 11:07:20'),
-- (2, 1, '{"type": "text", "text": "Please check if there are any conflicts in the project timeline."}', '2025-04-08 11:07:40'),
-- (3, 1, '{"type": "text", "text": "We’re close to finishing, just a few more tweaks."}', '2025-04-08 11:08:00'),
-- (1, 1, '{"type": "text", "text": "Can we discuss the risks in the next meeting?"}', '2025-04-08 11:08:20'),
-- (2, 1, '{"type": "text", "text": "I’m addressing the bugs reported earlier today."}', '2025-04-08 11:08:40'),
-- (3, 1, '{"type": "text", "text": "The system is now stable after the update."}', '2025-04-08 11:09:00'),
-- (1, 1, '{"type": "text", "text": "Is everyone ready for the presentation tomorrow?"}', '2025-04-08 11:09:20'),
-- (2, 1, '{"type": "text", "text": "I’ve prepared the meeting agenda for tomorrow."}', '2025-04-08 11:09:40'),
-- (3, 1, '{"type": "text", "text": "We need to prioritize the critical tasks for this sprint."}', '2025-04-08 11:10:00'),
-- (1, 1, '{"type": "text", "text": "Please check the meeting invite and confirm your availability."}', '2025-04-08 11:10:20'),
-- (2, 1, '{"type": "text", "text": "I’ll be out of the office for the rest of the day."}', '2025-04-08 11:10:40'),
-- (3, 1, '{"type": "text", "text": "Let me know if you need help with anything related to the project."}', '2025-04-08 11:11:00'),
-- (1, 1, '{"type": "text", "text": "Can we sync up to go over the next steps?"}', '2025-04-08 11:11:20'),
-- (2, 1, '{"type": "text", "text": "The demo went well; we just need to polish a few things."}', '2025-04-08 11:11:40'),
-- (3, 1, '{"type": "text", "text": "I’ll take care of the deployment tomorrow."}', '2025-04-08 11:12:00'),
-- (1, 1, '{"type": "text", "text": "Please send me any updates by the end of the day."}', '2025-04-08 11:12:20'),
-- (2, 1, '{"type": "text", "text": "Can you confirm if the backup system is working as expected?"}', '2025-04-08 11:12:40'),
-- (3, 1, '{"type": "text", "text": "We need to schedule a quick sync for next week."}', '2025-04-08 11:13:00');

-- SELECT * FROM "GroupMessage";
