// AdaptiveSchedule Test Cases
// Contains test cases for manual time block creation and AI-assisted adaptive scheduling

import { AdaptiveSchedule } from './adaptiveschedule';
import { Task, TimeBlock, Session, Preference, User } from './types';
import { GeminiLLM, Config } from './gemini-llm';

/**
 * Load configuration from config.json
 */
function loadConfig(): Config {
    try {
        const config = require('../config.json');
        return config;
    } catch (error) {
        console.error('❌ Error loading config.json. Please ensure it exists with your API key.');
        console.error('Error details:', (error as Error).message);
        process.exit(1);
    }
}

/**
 * Test case 1: Manual time block creation
 * Demonstrates creating time blocks and manually assigning tasks
 */
export async function testManualTimeBlocks(): Promise<void> {
    console.log('\n🧪 TEST CASE 1: Manual Time Block Creation');
    console.log('==========================================');

    const scheduler = new AdaptiveSchedule();
    const owner: User = 'Avril';

    // Create some sample tasks
    const task1: Task = {
        owner: 'Avril',
        taskId: 'task-1',
        taskName: 'Finish 6.1040 pset',
        category: 'School',
        duration: 90,
        priority: 2, // Important - has upcoming deadline
        splittable: false,
        deadline: '2025-10-05T23:59:00Z'
    };

    const task2: Task = {
        owner: 'Avril',
        taskId: 'task-2',
        taskName: 'Review for 6.3900 exam',
        category: 'School',
        duration: 60,
        priority: 3, // Regular task
        splittable: true
    };

    // Create time blocks manually
    console.log('⏰ Creating time blocks manually...');
    const block1 = scheduler.addTimeBlock(owner, '2025-10-04T14:00:00Z', '2025-10-04T15:30:00Z');
    const block2 = scheduler.addTimeBlock(owner, '2025-10-04T16:00:00Z', '2025-10-04T17:00:00Z');

    console.log(`✅ Created block: ${block1}`);
    console.log(`✅ Created block: ${block2}`);

    // Manually assign tasks to blocks
    console.log('\n📝 Manually assigning tasks to blocks...');
    const blocks = scheduler.getAdaptiveSchedule(owner);
    if (blocks.length >= 2) {
        blocks[0].taskSet.push(task1);
        blocks[1].taskSet.push(task2);
        console.log(`✅ Assigned "${task1.taskName}" to ${block1}`);
        console.log(`✅ Assigned "${task2.taskName}" to ${block2}`);
    }

    // Display the schedule
    scheduler.displayAdaptiveSchedule(owner);
}

/**
 * Test case 2: AI-assisted adaptive scheduling
 * Demonstrates using LLM to generate adaptive schedule based on tasks, schedule, and routine
 */
export async function testAIAdaptiveScheduling(): Promise<void> {
    console.log('\n🧪 TEST CASE 2: AI-Assisted Adaptive Scheduling');
    console.log('===============================================');

    const scheduler = new AdaptiveSchedule();
    const config = loadConfig();
    const llm = new GeminiLLM(config);
    const owner: User = 'Fuqi';

    // Create sample tasks
    const tasks: Task[] = [
        {
            owner: owner,
            taskId: 'task-1',
            taskName: 'Complete Project Proposal',
            category: 'Work',
            duration: 120,
            priority: 1, // Critical - urgent deadline before team meeting
            splittable: false,
            timeBlockSet: ['planned-1'],
            deadline: '2025-10-05T17:00:00Z',
            note: 'Critical priority - needs to be done before team meeting'
        },
        {
            owner: owner,
            taskId: 'task-2',
            taskName: 'Review Pull Requests',
            category: 'Work',
            duration: 45,
            priority: 2, // Important - should be done soon
            splittable: true,
            timeBlockSet: ['planned-2']
        },
        {
            owner: owner,
            taskId: 'task-3',
            taskName: 'Gym Workout',
            category: 'Health',
            duration: 60,
            priority: 3, // Regular - necessary but not urgent
            splittable: false,
            timeBlockSet: ['planned-3']
        },
        {
            owner: owner,
            taskId: 'task-4',
            taskName: 'Prepare Dinner',
            category: 'Personal',
            duration: 30,
            priority: 3, // Regular - necessary daily task
            splittable: false,
            timeBlockSet: ['planned-4']
        },
        {
            owner: owner,
            taskId: 'task-5',
            taskName: 'Study Spanish',
            category: 'Learning',
            duration: 30,
            priority: 4, // Low - can be done later
            splittable: true,
            timeBlockSet: ['planned-5']
        }
    ];

    // Create planned schedule (what was originally planned)
    const schedule: TimeBlock[] = [
        {
            timeBlockId: 'planned-1',
            owner: owner,
            start: '2025-10-04T09:00:00Z',
            end: '2025-10-04T11:00:00Z',
            taskIdSet: ['task-1'] // Complete Project Proposal (120 min)
        },
        {
            timeBlockId: 'planned-2',
            owner: owner,
            start: '2025-10-04T14:00:00Z',
            end: '2025-10-04T15:00:00Z',
            taskIdSet: ['task-2'] // Review Pull Requests (45 min)
        },
        {
            timeBlockId: 'planned-3',
            owner: owner,
            start: '2025-10-04T17:00:00Z',
            end: '2025-10-04T18:00:00Z',
            taskIdSet: ['task-3'] // Gym Workout (60 min)
        },
        {
            timeBlockId: 'planned-4',
            owner: owner,
            start: '2025-10-04T18:00:00Z',
            end: '2025-10-04T18:30:00Z',
            taskIdSet: ['task-4'] // Prepare Dinner (30 min)
        },
        {
            timeBlockId: 'planned-5',
            owner: owner,
            start: '2025-10-04T19:00:00Z',
            end: '2025-10-04T19:30:00Z',
            taskIdSet: ['task-5'] // Study Spanish (30 min)
        }
    ];

    // Create actual routine (what actually happened - deviated from plan)
    const routine: Session[] = [
        {
            owner: owner,
            sessionName: 'Morning Meeting',
            sessionId: 'session-1',
            isPaused: false,
            isActive: false,
            start: '2025-10-04T09:00:00Z',
            end: '2025-10-04T10:30:00Z',
            interruptReason: 'Unexpected urgent meeting took longer than expected'
        },
        {
            owner: owner,
            sessionName: 'Started Project Proposal',
            sessionId: 'session-2',
            isPaused: true,
            isActive: false,
            start: '2025-10-04T10:30:00Z',
            end: '2025-10-04T11:00:00Z',
            linkedTask: tasks[0],
            interruptReason: 'Had to stop due to lunch break, only completed 30 minutes'
        }
    ];

    // Set current time (fixed for testing)
    const currentTime = '2025-10-04T13:00:00Z'; // 1:00 PM - fixed current time for testing

    // Filter for unfinished tasks only
    // Task 1 has been partially completed (30 min out of 120 min), so 90 min remaining
    const unfinishedTasks: Task[] = [
        {
            ...tasks[0], // Complete Project Proposal - still needs 90 more minutes
            duration: 90, // Remaining duration after 30 min completed
            note: 'Critical priority - needs to be done before team meeting. 30 minutes already completed, 90 minutes remaining.'
        },
        tasks[1], // Review Pull Requests - not started
        tasks[2], // Gym Workout - not started
        tasks[3], // Prepare Dinner - not started
        tasks[4]  // Study Spanish - not started
    ];

    // User preferences
    const preferences: Preference = {
        preferences: [
            'Prefer to work on high-priority tasks in the morning when fresh',
            'Exercise in late afternoon or early evening',
            'Avoid scheduling demanding work after 9 PM',
            'Prefer to batch similar tasks together',
            'Keep meals at regular times (lunch 12-1 PM, dinner 6-7 PM)'
        ]
    };

    console.log('⏰ Current time (fixed for testing):', currentTime, '(1:00 PM)');
    console.log('📝 Unfinished tasks to schedule:', unfinishedTasks.length);
    console.log('📅 Original planned schedule blocks:', schedule.length);
    console.log('📊 Actual routine sessions so far:', routine.length);

    // Request adaptive schedule from AI for unfinished tasks only, starting from current time
    await scheduler.requestAdaptiveScheduleAI(owner, unfinishedTasks, schedule, routine, preferences, llm, currentTime);

    // Display the final adaptive schedule with comparison to original
    scheduler.displayAdaptiveSchedule(owner, schedule, currentTime, routine, tasks, preferences);
}

/**
 * Test case 3: Task Dependencies
 * Tests ONLY task dependencies - verifies AI respects preDependence constraints
 */
export async function testDependencies(): Promise<void> {
    console.log('\n🧪 TEST CASE 3: Task Dependencies');
    console.log('==================================');

    const scheduler = new AdaptiveSchedule();
    const config = loadConfig();
    const llm = new GeminiLLM(config);
    const owner: User = 'Friday';

    // Create a simple dependency chain: task1 -> task2 -> task3
    const task1: Task = {
        owner: 'Friday',
        taskId: 'task-1',
        taskName: 'Research Paper Topic',
        category: 'Study',
        duration: 60,
        priority: 2,
        splittable: false,
        timeBlockSet: ['planned-1']
    };

    const task2: Task = {
        owner: 'Friday',
        taskId: 'task-2',
        taskName: 'Create Paper Outline',
        category: 'Study',
        duration: 60,
        priority: 2,
        splittable: false,
        preDependence: [task1], // MUST be done after task1
        timeBlockSet: ['planned-2']
    };

    const task3: Task = {
        owner: 'Friday',
        taskId: 'task-3',
        taskName: 'Write First Draft',
        category: 'Study',
        duration: 60,
        priority: 1,
        splittable: false,
        preDependence: [task2], // MUST be done after task2
        timeBlockSet: ['planned-3']
    };

    const tasks: Task[] = [task1, task2, task3];

    // Original planned schedule with all tasks in order
    const schedule: TimeBlock[] = [
        {
            timeBlockId: 'planned-1',
            owner: 'Friday',
            start: '2025-10-04T09:00:00Z',
            end: '2025-10-04T10:00:00Z',
            taskIdSet: ['task-1']
        },
        {
            timeBlockId: 'planned-2',
            owner: 'Friday',
            start: '2025-10-04T10:00:00Z',
            end: '2025-10-04T11:00:00Z',
            taskIdSet: ['task-2']
        },
        {
            timeBlockId: 'planned-3',
            owner: 'Friday',
            start: '2025-10-04T11:00:00Z',
            end: '2025-10-04T12:00:00Z',
            taskIdSet: ['task-3']
        }
    ];

    // Actual routine - plan was disrupted, tasks NOT done in planned order
    // Task 1 was NOT completed as planned (only partially done)
    // Task 2 and 3 also not done
    const routine: Session[] = [
        {
            owner: owner,
            sessionName: 'Started Research',
            sessionId: 'session-1',
            isPaused: true,
            isActive: false,
            start: '2025-10-04T09:00:00Z',
            end: '2025-10-04T09:30:00Z',
            linkedTask: task1,
            interruptReason: 'Unexpected meeting interrupted - only completed 30 minutes of 60 minute task'
        },
        {
            owner: owner,
            sessionName: 'Emergency Meeting',
            sessionId: 'session-2',
            isPaused: false,
            isActive: false,
            start: '2025-10-04T09:30:00Z',
            end: '2025-10-04T11:30:00Z',
            interruptReason: 'Unplanned urgent meeting took 2 hours'
        }
    ];

    // Set current time
    const currentTime = '2025-10-04T11:30:00Z'; // 11:30 AM - after the meeting

    // Filter for unfinished tasks
    const unfinishedTasks: Task[] = [
        {
            ...task1,
            duration: 30, // 30 minutes remaining
            note: 'Still needs 30 more minutes to complete'
        },
        task2, // Not started - depends on task1
        task3  // Not started - depends on task2
    ];

    // Simple preferences focusing only on dependencies
    const preferences: Preference = {
        preferences: [
            'Respect task dependencies - never schedule a task before its prerequisites'
        ]
    };

    console.log('📝 Total tasks:', tasks.length);
    console.log('🔗 Dependency chain: task-1 → task-2 → task-3');
    console.log('⏰ Current time: 11:30 AM');
    console.log('');
    console.log('What happened:');
    console.log('  - Task 1: Only 30/60 min completed (interrupted by meeting)');
    console.log('  - Task 2: Not started');
    console.log('  - Task 3: Not started');
    console.log('');
    console.log('Expected adaptive behavior:');
    console.log('  - Complete remaining 30 min of Task 1 first');
    console.log('  - Then schedule Task 2 (depends on Task 1 completion)');
    console.log('  - Finally schedule Task 3 (depends on Task 2 completion)');

    // Request adaptive schedule from AI for unfinished tasks only
    await scheduler.requestAdaptiveScheduleAI(owner, unfinishedTasks, schedule, routine, preferences, llm, currentTime);

    // Display the final adaptive schedule with comparison to original
    scheduler.displayAdaptiveSchedule(owner, schedule, currentTime, routine, tasks, preferences);
}

/**
 * Test case 4: Deadlines and Concurrent Tasks
 * Tests deadline constraints and concurrent task scheduling
 */
export async function testDeadlinesAndConcurrency(): Promise<void> {
    console.log('\n🧪 TEST CASE 4: Deadlines and Concurrent Tasks');
    console.log('================================================');

    const scheduler = new AdaptiveSchedule();
    const config = loadConfig();
    const llm = new GeminiLLM(config);
    const owner: User = 'Alex';

    // Task with urgent deadline
    const task1: Task = {
        owner: owner,
        taskId: 'task-1',
        taskName: 'Submit Assignment',
        category: 'School',
        duration: 120, // Increased from 90 to make it tighter
        priority: 1, // Critical - has urgent deadline
        splittable: false,
        deadline: '2025-10-04T17:00:00Z', // Due at 5 PM today!
        timeBlockSet: ['planned-1']
    };

    // Task with later deadline
    const task2: Task = {
        owner: owner,
        taskId: 'task-2',
        taskName: 'Study for Exam',
        category: 'School',
        duration: 120,
        priority: 2, // Important but deadline is tomorrow
        splittable: true,
        deadline: '2025-10-05T23:59:00Z', // Due tomorrow
        timeBlockSet: ['planned-2']
    };

    // Task that can be done concurrently (e.g., laundry)
    const task3: Task = {
        owner: owner,
        taskId: 'task-3',
        taskName: 'Do Laundry',
        category: 'Chores',
        duration: 90,
        priority: 3,
        splittable: true,
        note: 'Can be done concurrently with other tasks - just need to start/stop machines',
        timeBlockSet: ['planned-3']
    };

    // Low priority task
    const task4: Task = {
        owner: owner,
        taskId: 'task-4',
        taskName: 'Watch Lecture Recording',
        category: 'School',
        duration: 60,
        priority: 4,
        splittable: true,
        timeBlockSet: ['planned-4']
    };

    // Very low priority task
    const task5: Task = {
        owner: owner,
        taskId: 'task-5',
        taskName: 'Organize Notes',
        category: 'School',
        duration: 45,
        priority: 5, // Lowest priority - nice to have but not essential
        splittable: true,
        timeBlockSet: ['planned-5']
    };

    // Another low priority task
    const task6: Task = {
        owner: owner,
        taskId: 'task-6',
        taskName: 'Clean Room',
        category: 'Chores',
        duration: 60,
        priority: 4,
        splittable: true,
        timeBlockSet: ['planned-6']
    };

    const tasks: Task[] = [task1, task2, task3, task4, task5, task6];

    // Original planned schedule
    const schedule: TimeBlock[] = [
        {
            timeBlockId: 'planned-1',
            owner: owner,
            start: '2025-10-04T09:00:00Z',
            end: '2025-10-04T11:00:00Z', // 120 minutes for task-1
            taskIdSet: ['task-1']
        },
        {
            timeBlockId: 'planned-2',
            owner: owner,
            start: '2025-10-04T11:00:00Z',
            end: '2025-10-04T13:00:00Z', // 120 minutes for task-2
            taskIdSet: ['task-2']
        },
        {
            timeBlockId: 'planned-3',
            owner: owner,
            start: '2025-10-04T14:00:00Z',
            end: '2025-10-04T15:30:00Z', // 90 minutes for task-3
            taskIdSet: ['task-3']
        },
        {
            timeBlockId: 'planned-4',
            owner: owner,
            start: '2025-10-04T15:30:00Z',
            end: '2025-10-04T16:30:00Z', // 60 minutes for task-4
            taskIdSet: ['task-4']
        },
        {
            timeBlockId: 'planned-5',
            owner: owner,
            start: '2025-10-04T16:30:00Z',
            end: '2025-10-04T17:15:00Z', // 45 minutes for task-5
            taskIdSet: ['task-5']
        },
        {
            timeBlockId: 'planned-6',
            owner: owner,
            start: '2025-10-04T17:15:00Z',
            end: '2025-10-04T18:15:00Z', // 60 minutes for task-6
            taskIdSet: ['task-6']
        }
    ];

    // Actual routine - morning was unproductive
    const routine: Session[] = [
        {
            owner: owner,
            sessionName: 'Attempted Assignment',
            sessionId: 'session-1',
            isPaused: true,
            isActive: false,
            start: '2025-10-04T09:00:00Z',
            end: '2025-10-04T09:20:00Z',
            linkedTask: task1,
            interruptReason: 'Got stuck, only worked 20 minutes out of planned 90'
        },
        {
            owner: owner,
            sessionName: 'Distraction Period',
            sessionId: 'session-2',
            isPaused: false,
            isActive: false,
            start: '2025-10-04T09:20:00Z',
            end: '2025-10-04T12:00:00Z',
            interruptReason: 'Wasted time on social media and other distractions'
        }
    ];

    // Current time is noon
    const currentTime = '2025-10-04T12:00:00Z'; // 12:00 PM

    // Unfinished tasks
    const unfinishedTasks: Task[] = [
        {
            ...task1,
            duration: 100, // 100 minutes remaining (20 already done out of 120)
            note: 'URGENT: Due at 5 PM today! Only 5 hours left. Already spent 20 min, need 100 more.'
        },
        task2,
        task3,
        task4,
        task5,
        task6
    ];

    // User preferences
    const preferences: Preference = {
        preferences: [
            'CRITICAL: Must finish all work by 5:00 PM (17:00) - no exceptions, this is a hard deadline',
            'CRITICAL: Prioritize tasks with urgent deadlines first',
            'Schedule concurrent tasks (like laundry) alongside other work to save time',
            'Avoid dropping tasks with approaching deadlines',
            'If time is tight, drop lower priority tasks to meet the 5 PM deadline'
        ]
    };

    console.log('📝 Total tasks:', tasks.length);
    console.log('⏰ Current time: 12:00 PM');
    console.log('⚠️  URGENT: Assignment due at 5:00 PM (only 5 hours left!)');
    console.log('');
    console.log('What happened:');
    console.log('  - Assignment: Only 20/120 min completed');
    console.log('  - Morning wasted on distractions (9:20 AM - 12:00 PM)');
    console.log('  - All other tasks: Not started');
    console.log('');
    console.log('Time available: 5 hours (300 minutes)');
    console.log('Total work needed: 100 + 120 + 90 + 60 + 45 + 60 = 475 minutes');
    console.log('Deficit: 175 minutes - some tasks MUST be dropped!');
    console.log('');
    console.log('Expected adaptive behavior:');
    console.log('  1. Prioritize finishing Assignment BEFORE 5 PM deadline (non-negotiable!)');
    console.log('  2. Schedule high-priority Study task (deadline tomorrow)');
    console.log('  3. Consider concurrent scheduling for Laundry');
    console.log('  4. DROP lowest priority tasks (task-5 "Organize Notes" priority 5, task-6 "Clean Room" priority 4)');

    // Request adaptive schedule from AI
    await scheduler.requestAdaptiveScheduleAI(owner, unfinishedTasks, schedule, routine, preferences, llm, currentTime);

    // Display the final adaptive schedule
    scheduler.displayAdaptiveSchedule(owner, schedule, currentTime, routine, tasks, preferences);

    // Log dropped tasks
    const droppedTaskIds = scheduler.getDroppedTaskIds(owner);
    if (droppedTaskIds.length > 0) {
        console.log('\n⚠️  Analysis of Dropped Tasks:');
        console.log('================================');
        for (const taskId of droppedTaskIds) {
            const task = tasks.find(t => t.taskId === taskId);
            if (task) {
                console.log(`\n📋 ${task.taskName}`);
                console.log(`   Priority: ${task.priority} (${task.priority === 1 ? 'Critical' : task.priority === 2 ? 'Important' : task.priority === 3 ? 'Regular' : 'Low'})`);
                console.log(`   Duration: ${task.duration} minutes`);
                if (task.deadline) {
                    console.log(`   Deadline: ${task.deadline}`);
                }
                console.log(`   Reason: Insufficient time to schedule before urgent deadline`);
            }
        }
    } else {
        console.log('\n✅ All tasks were successfully scheduled!');
    }
}

/**
 * Test case 5: Unassign blocks
 * Demonstrates unassigning tasks from time blocks
 */
export async function testUnassignBlock(): Promise<void> {
    console.log('\n🧪 TEST CASE 5: Unassign Tasks from Blocks');
    console.log('==========================================');

    const scheduler = new AdaptiveSchedule();
    const owner: User = 'diana';

    const task1: Task = {
        owner: 'diana',
        taskId: 'task-1',
        taskName: 'Morning Exercise',
        category: 'Health',
        duration: 60,
        priority: 3, // Regular - necessary for health
        splittable: false
    };

    // Create a block and manually assign task
    const blockId = scheduler.addTimeBlock(owner, '2025-10-04T07:00:00Z', '2025-10-04T08:00:00Z');
    const blocks = scheduler.getAdaptiveSchedule(owner);
    if (blocks.length > 0) {
        blocks[0].taskSet.push(task1);
    }

    console.log('📅 Before unassigning:');
    scheduler.displayAdaptiveSchedule(owner);

    // Unassign the task
    console.log('\n🗑️  Unassigning task from block...');
    scheduler.unassignBlock(owner, 'task-1', blockId);

    console.log('\n📅 After unassigning:');
    scheduler.displayAdaptiveSchedule(owner);
}

/**
 * Main function to run all test cases
 */
async function main(): Promise<void> {
    console.log('🎓 AdaptiveSchedule Test Suite');
    console.log('===============================\n');

    try {
        // Run manual time block test
        // await testManualTimeBlocks();

        // Run AI adaptive scheduling test
        // await testAIAdaptiveScheduling();

        // // Run complex scenario test
        // await testDependencies();
        await testDeadlinesAndConcurrency();

        // // Run unassign test
        // await testUnassignBlock();

        console.log('\n🎉 All test cases completed successfully!');

    } catch (error) {
        console.error('❌ Test error:', (error as Error).message);
        process.exit(1);
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    main();
}
