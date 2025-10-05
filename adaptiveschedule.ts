import { GeminiLLM } from "./gemini-llm";
import {
  User,
  Task,
  Schedule,
  Routine,
  Preference,
  AdaptiveBlock,
} from "./types";

// AdaptiveSchedule ai-augmented concept implementation

export class AdaptiveSchedule {
  private adaptiveBlocks: AdaptiveBlock[] = [];
  private blockIdCounter: number = 0;
  private droppedTaskIds: Map<User, string[]> = new Map(); // Tasks that couldn't be scheduled due to time constraints

  addTimeBlock(owner: User, start: string, end: string): string {
    // Validate times (precondition)
    const startTime = new Date(start);
    const endTime = new Date(end);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error("addTimeBlock failed: Invalid start or end time input");
    }

    if (startTime >= endTime) {
      throw new Error(
        "addTimeBlock failed: Start time must be before end time"
      );
    }

    // Create new adaptive block
    const timeBlockId = `adaptive-block-${this.blockIdCounter++}`;
    const newBlock: AdaptiveBlock = {
      timeBlockId,
      owner,
      start,
      end,
      taskSet: [],
    };
    this.adaptiveBlocks.push(newBlock);
    return timeBlockId;
  }

  /**
   * AI-assisted adaptive scheduling action
   * Analyzes tasks, schedule, routine, and preferences to generate optimal adaptive schedule
   */
  async requestAdaptiveScheduleAI(
    owner: User,
    tasks: Task[],
    schedule: Schedule,
    routine: Routine,
    preference: Preference,
    llm: GeminiLLM,
    currentTime?: string
  ): Promise<AdaptiveBlock[]> {
    try {
      console.log("🤖 Requesting adaptive schedule from Gemini AI...");

      // Filter tasks owned by this user
      const userTasks = tasks.filter((task) => task.owner === owner);

      if (userTasks.length === 0) {
        console.log("✅ No tasks to schedule for this user!");
        return this.getAdaptiveSchedule(owner);
      }

      // Filter schedule and routine for this user
      const userSchedule = schedule.filter((block) => block.owner === owner);
      const userRoutine = routine.filter((session) => session.owner === owner);

      // Create custom prompt for LLM that provides required context
      const prompt = this.createAdaptiveSchedulePrompt(
        owner,
        userTasks,
        userSchedule,
        userRoutine,
        preference,
        currentTime
      );

      const text = await llm.executeLLM(prompt);

      console.log("\n🤖 RAW GEMINI RESPONSE");
      console.log("======================");
      console.log(text);
      console.log("======================\n");

      // Parse and apply the adaptive schedule
      this.parseAndApplyAdaptiveSchedule(text, owner, userTasks);

      return this.getAdaptiveSchedule(owner);
    } catch (error) {
      console.error("❌ Error calling Gemini API:", (error as Error).message);
      throw error;
    }
  }

  /**
   * Unassign a task from a specific time block
   */
  unassignBlock(owner: User, taskId: string, timeBlockId: string): void {
    const block = this.adaptiveBlocks.find(
      (b) => b.owner === owner && b.timeBlockId === timeBlockId
    );

    if (!block) {
      throw new Error(
        `Adaptive block ${timeBlockId} not found for owner ${owner}`
      );
    }

    const taskIndex = block.taskSet.findIndex((task) => task.taskId === taskId);

    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found in block ${timeBlockId}`);
    }

    block.taskSet.splice(taskIndex, 1);
  }

  /**
   * Get all adaptive blocks for a specific owner
   */
  getAdaptiveSchedule(owner: User): AdaptiveBlock[] {
    return this.adaptiveBlocks.filter((block) => block.owner === owner);
  }

  /**
   * Get dropped task IDs for a specific owner
   * These are tasks that couldn't be scheduled due to insufficient time
   */
  getDroppedTaskIds(owner: User): string[] {
    return this.droppedTaskIds.get(owner) || [];
  }

  /**
   * Create the prompt for Gemini to generate adaptive schedule
   */
  private createAdaptiveSchedulePrompt(
    owner: User,
    tasks: Task[],
    schedule: Schedule,
    routine: Routine,
    preference: Preference,
    currentTime?: string
  ): string {
    const existingBlocksSection =
      this.adaptiveBlocks.filter((b) => b.owner === owner).length > 0
        ? `\nEXISTING ADAPTIVE BLOCKS:\n${this.adaptiveBlocksToString(owner)}\n`
        : "";

    const currentTimeSection = currentTime
      ? `\nCURRENT TIME: ${currentTime}\n** CRITICAL: You MUST schedule all time blocks to start at or after this current time. Do NOT schedule anything before ${currentTime}. **`
      : "";

    return `
    You are a helpful AI assistant that creates optimal adaptive schedules for users based on task analysis, planned schedules, actual routines, and user preferences.

    USER: ${owner}
    ${currentTimeSection}

    USER PREFERENCES:
    ${preference.preferences.map((p) => `- ${p}`).join("\n")}

    TASKS TO SCHEDULE:
    ** CRITICAL: ALL tasks listed below MUST be scheduled. Each task represents work that still needs to be done. **
    ** If a task has a note indicating "remaining" work, schedule exactly the duration specified. **
    ${this.tasksToString(tasks)}

    PLANNED SCHEDULE (Original Plan):
    ${this.scheduleToString(schedule)}

    ACTUAL ROUTINE (What Actually Happened):
    ${this.routineToString(routine)}

    EXISTING ADAPTIVE BLOCK:
    ${existingBlocksSection}

    TASK PRIORITY SCALE (1-5), determines how urgent the task is:
    - Priority 1 (Critical): Must be done ASAP - urgent deadlines, emergencies
    - Priority 2 (Important): Should be done soon - upcoming deadlines, high impact
    - Priority 3 (Regular): Necessary but not urgent
    - Priority 4 (Low): Can be done later
    - Priority 5 (Optional): Can be done if time permits - not time-sensitive or important

    ANALYSIS REQUIREMENTS:
    1. Analyze the deviation between the planned schedule and actual routine
    2. Identify tasks that were not completed or were interrupted
    3. Consider task priorities (1 = highest priority, 5 = lowest priority), deadlines, and dependencies
    4. Schedule critical tasks (priority 1-2) before lower priority tasks
    5. Consider user preferences for scheduling
    6. Respect task constraints (duration, splittable, slack)
    7. Avoid scheduling multiple tasks in the same time block UNLESS they can be executed concurrently (e.g., laundry + homework)

    SCHEDULING CONSTRAINTS:
    - Times must be in ISO 8601 format (e.g., "2025-10-04T14:00:00Z")
    - Start time must be before end time
    - ALL time blocks MUST start at or after the CURRENT TIME if provided
    - **CRITICAL: Time block duration MUST be at least as long as the total duration of tasks assigned to it**
    - For non-splittable tasks, the block must be at least as long as the task duration
    - For splittable tasks, you can either: (1) create a single block with duration >= task duration, OR (2) split across multiple blocks where sum of block durations >= task duration
    - High priority tasks should be scheduled first
    - Respect task deadlines
    - Consider dependencies (preDependence tasks must be scheduled before dependent tasks)
    - If a task is splittable, it can be divided across multiple blocks. Otherwise, do not divide it across multiple **non-consecutive blocks**.
    - Allow multiple tasks per block ONLY if they can be done concurrently

    CRITICAL REQUIREMENTS:
    1. ONLY schedule the tasks listed above - do NOT add any new tasks
    2. Ensure all scheduled blocks have valid ISO timestamps
    3. Assign tasks based on priority and deadline urgency
    4. **ABSOLUTE DEADLINE CONSTRAINT: If a task has a deadline, it MUST be completed BEFORE that deadline. Do NOT schedule any part of the task after its deadline.**
    5. **If there is insufficient time to complete all tasks before their deadlines, you MUST drop the lowest priority tasks and put them in droppedTaskIds**
    6. Consider the actual routine and how it deviates from the schedule to understand what time blocks are realistic
    7. Provide reasoning for why actual routine deviated from the original planned schedule
    8. For a task with a long duration and is splittable, consider splitting it into multiple non-consecutive time blocks for better focus
    9. If time is insufficient to schedule all tasks, prioritize tasks with urgent deadlines (approaching soon) or higher priority (1-2); put lower priority tasks or tasks without urgent deadlines in droppedTaskIds

    Return your response as a JSON object with this exact structure:
    {
    "analysis": "Brief analysis of why the schedule deviated from the routine and key insights",
    "adaptiveBlocks": [
        {
        "start": "ISO timestamp",
        "end": "ISO timestamp",
        "taskIds": ["taskId1", "taskId2"]
        }
    ],
    "droppedTaskIds": ["taskId3", "taskId4"]
    }

    EXAMPLE - If task-1 has deadline at 5 PM and current time is 12 PM:
    - Available time: 5 hours (300 minutes)
    - If task-1 needs 100 min + other high priority tasks need 200 min = 300 min total
    - Low priority tasks (task-5, task-6) CANNOT fit before deadline
    - CORRECT: Put task-5 and task-6 in droppedTaskIds
    - WRONG: Schedule tasks after the 5 PM deadline

    Return ONLY the JSON object, no additional text.`;
  }

  // Parse the LLM response and apply the adaptive schedule
  private parseAndApplyAdaptiveSchedule(
    responseText: string,
    owner: User,
    tasks: Task[]
  ): void {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const response = JSON.parse(jsonMatch[0]);

      if (!response.adaptiveBlocks || !Array.isArray(response.adaptiveBlocks)) {
        throw new Error("Invalid response format");
      }

      console.log("📝 Analysis from AI:", response.analysis);
      console.log("\n📝 Applying adaptive schedule...");

      // Create task lookup map
      const taskMap = new Map<string, Task>();
      for (const task of tasks) {
        taskMap.set(task.taskId, task);
      }

      // Clear existing adaptive blocks and dropped tasks for this owner
      this.adaptiveBlocks = this.adaptiveBlocks.filter(
        (b) => b.owner !== owner
      );
      this.blockIdCounter = 0;

      // Handle dropped tasks
      if (response.droppedTaskIds && Array.isArray(response.droppedTaskIds)) {
        this.droppedTaskIds.set(owner, response.droppedTaskIds);
        if (response.droppedTaskIds.length > 0) {
          console.log("\n⚠️ Dropped tasks (for insufficient time):");
          response.droppedTaskIds.forEach((taskId: string) => {
            const task = taskMap.get(taskId);
            if (task) {
              console.log(`   - ${task.taskName} (Priority: ${task.priority})`);
            } else {
              console.log(`   - ${taskId} (task not found)`);
            }
          });
        }
      } else {
        this.droppedTaskIds.set(owner, []);
      }

      const issues: string[] = [];

      for (const block of response.adaptiveBlocks) {
        const { start, end, taskIds } = block;

        // Validate timestamps
        const startTime = new Date(start);
        const endTime = new Date(end);

        if (isNaN(startTime.getTime())) {
          issues.push(`Invalid start time: ${start}`);
          continue;
        }

        if (isNaN(endTime.getTime())) {
          issues.push(`Invalid end time: ${end}`);
          continue;
        }

        if (startTime >= endTime) {
          issues.push(`Start time must be before end time: ${start} >= ${end}`);
          continue;
        }

        // Validate task IDs
        if (!Array.isArray(taskIds)) {
          issues.push("taskIds must be an array");
          continue;
        }

        const blockTasks: Task[] = [];
        for (const taskId of taskIds) {
          const task = taskMap.get(taskId);
          if (!task) {
            issues.push(`Task ${taskId} not found in task list`);
            continue;
          }
          blockTasks.push(task);
        }

        // Create the adaptive block
        const timeBlockId = this.addTimeBlock(owner, start, end);
        const adaptiveBlock = this.adaptiveBlocks.find(
          (b) => b.timeBlockId === timeBlockId
        );
        if (adaptiveBlock) {
          adaptiveBlock.taskSet = blockTasks;

          // Calculate block duration in minutes
          const blockDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
          const totalTaskDuration = blockTasks.reduce((sum, task) => sum + task.duration, 0);

          console.log(
            `✅ Created adaptive block ${timeBlockId}: ${start} - ${end}`
          );
          console.log(
            `   Tasks: ${blockTasks.map((t) => t.taskName).join(", ")}`
          );

          // Validate duration match
          if (totalTaskDuration > blockDuration) {
            console.warn(
              `   ⚠️  WARNING: Block duration (${blockDuration} min) is less than total task duration (${totalTaskDuration} min)`
            );
          }
        }
      }

      // Run validators on the generated schedule
      console.log("\n🔍 Running validators on LLM output...");
      const validationErrors = this.validateSchedule(owner, tasks);

      if (validationErrors.length > 0) {
        console.error("\n❌ VALIDATION ERRORS DETECTED:");
        validationErrors.forEach((error) => console.error(`   - ${error}`));
        throw new Error(`LLM output failed validation with ${validationErrors.length} error(s)`);
      } else {
        console.log("✅ All validations passed!");
      }

      if (issues.length > 0) {
        console.warn("\n⚠️ Some issues occurred while parsing:");
        issues.forEach((issue) => console.warn(`   - ${issue}`));
      }
    } catch (error) {
      console.error("❌ Error parsing LLM response:", (error as Error).message);
      console.log("Response was:", responseText);
      throw error;
    }
  }

  /**
   * Validate the LLM-generated schedule for common errors
   */
  private validateSchedule(owner: User, originalTasks: Task[]): string[] {
    const errors: string[] = [];
    const scheduledBlocks = this.getAdaptiveSchedule(owner);
    const droppedTaskIds = this.getDroppedTaskIds(owner);

    // Create sets for tracking
    const originalTaskIds = new Set(originalTasks.map(t => t.taskId));
    const scheduledTaskIds = new Set<string>();
    const droppedTaskIdSet = new Set(droppedTaskIds);

    // Validator 1: Check for hallucinated tasks (tasks not in original list)
    for (const block of scheduledBlocks) {
      for (const task of block.taskSet) {
        if (!originalTaskIds.has(task.taskId)) {
          errors.push(`Hallucinated task: "${task.taskName}" (${task.taskId}) was not in the original task list`);
        }
        scheduledTaskIds.add(task.taskId);
      }
    }

    // Validator 2: Check for conflicting time blocks (overlapping schedules)
    for (let i = 0; i < scheduledBlocks.length; i++) {
      for (let j = i + 1; j < scheduledBlocks.length; j++) {
        const block1 = scheduledBlocks[i];
        const block2 = scheduledBlocks[j];

        const start1 = new Date(block1.start).getTime();
        const end1 = new Date(block1.end).getTime();
        const start2 = new Date(block2.start).getTime();
        const end2 = new Date(block2.end).getTime();

        // Check if blocks overlap
        if ((start1 < end2 && end1 > start2)) {
          // Check if tasks can be done concurrently
          const allTasksConcurrent = this.canTasksBeConcurrent(block1.taskSet, block2.taskSet);
          if (!allTasksConcurrent) {
            errors.push(
              `Time conflict: Blocks ${block1.timeBlockId} (${block1.start} - ${block1.end}) and ${block2.timeBlockId} (${block2.start} - ${block2.end}) overlap and contain non-concurrent tasks`
            );
          }
        }
      }
    }

    // Validator 3: Check for duplicate task scheduling (same task scheduled multiple times)
    const taskScheduleCount = new Map<string, number>();
    for (const block of scheduledBlocks) {
      for (const task of block.taskSet) {
        const count = taskScheduleCount.get(task.taskId) || 0;
        taskScheduleCount.set(task.taskId, count + 1);
      }
    }

    for (const [taskId, count] of taskScheduleCount) {
      if (count > 1) {
        const task = originalTasks.find(t => t.taskId === taskId);
        const taskName = task ? task.taskName : taskId;
        errors.push(`Duplicate scheduling: Task "${taskName}" (${taskId}) is scheduled ${count} times`);
      }
    }

    // Validator 4: Check for tasks scheduled AND dropped (contradictory state)
    for (const taskId of scheduledTaskIds) {
      if (droppedTaskIdSet.has(taskId)) {
        const task = originalTasks.find(t => t.taskId === taskId);
        const taskName = task ? task.taskName : taskId;
        errors.push(`Contradictory state: Task "${taskName}" (${taskId}) is both scheduled AND marked as dropped`);
      }
    }

    // Validator 5: Check for deadline violations
    for (const block of scheduledBlocks) {
      for (const task of block.taskSet) {
        if (task.deadline) {
          const blockEnd = new Date(block.end).getTime();
          const deadline = new Date(task.deadline).getTime();

          if (blockEnd > deadline) {
            errors.push(
              `Deadline violation: Task "${task.taskName}" (${task.taskId}) is scheduled to end at ${block.end} but has deadline at ${task.deadline}`
            );
          }
        }
      }
    }

    // Validator 6: Check for dependency violations
    const scheduledTaskOrder = new Map<string, number>();
    scheduledBlocks.forEach((block, index) => {
      block.taskSet.forEach(task => {
        if (!scheduledTaskOrder.has(task.taskId)) {
          scheduledTaskOrder.set(task.taskId, index);
        }
      });
    });

    for (const block of scheduledBlocks) {
      for (const task of block.taskSet) {
        if (task.preDependence && task.preDependence.length > 0) {
          const taskIndex = scheduledTaskOrder.get(task.taskId);

          for (const dependency of task.preDependence) {
            const depIndex = scheduledTaskOrder.get(dependency.taskId);

            // Check if dependency is scheduled
            if (depIndex === undefined) {
              // Dependency not scheduled - check if it's in the provided task list or dropped
              // A dependency might not be in the original task list if it was already completed
              const isDependencyInOriginalList = originalTaskIds.has(dependency.taskId);
              const isDependencyDropped = droppedTaskIdSet.has(dependency.taskId);

              // Only flag as error if dependency is in the task list but neither scheduled nor dropped
              if (isDependencyInOriginalList && !isDependencyDropped) {
                errors.push(
                  `Dependency violation: Task "${task.taskName}" depends on "${dependency.taskName}" which is neither scheduled nor dropped`
                );
              }
            } else if (taskIndex !== undefined && depIndex >= taskIndex) {
              // Dependency scheduled but comes after dependent task
              errors.push(
                `Dependency violation: Task "${task.taskName}" is scheduled before its dependency "${dependency.taskName}"`
              );
            }
          }
        }
      }
    }

    // Validator 7: Check for tasks in dropped list that aren't in original task list
    for (const taskId of droppedTaskIds) {
      if (!originalTaskIds.has(taskId)) {
        errors.push(`Invalid dropped task: "${taskId}" was not in the original task list`);
      }
    }

    return errors;
  }

  /**
   * Check if tasks can be done concurrently
   */
  private canTasksBeConcurrent(tasks1: Task[], tasks2: Task[]): boolean {
    // Tasks can be concurrent if at least one set contains a task with a note indicating concurrency
    // For example, laundry can be done concurrently with other tasks
    const allTasks = [...tasks1, ...tasks2];

    for (const task of allTasks) {
      if (task.note && task.note.toLowerCase().includes('concurrent')) {
        return true;
      }
    }

    return false;
  }

  // Helper function to convert tasks to string format
  private tasksToString(tasks: Task[]): string {
    return tasks
      .map((task) => {
        let desc = `- ${task.taskName} (ID: ${task.taskId})
            Category: ${task.category}
            Duration: ${task.duration} minutes
            Priority: ${task.priority}
            Splittable: ${task.splittable}`;

        if (task.deadline) {
          desc += `\n  Deadline: ${task.deadline}`;
        }
        if (task.slack) {
          desc += `\n  Slack: ${task.slack}`;
        }
        if (task.preDependence && task.preDependence.length > 0) {
          desc += `\n  Depends on: ${task.preDependence
            .map((t) => t.taskName)
            .join(", ")}`;
        }
        if (task.note) {
          desc += `\n  Note: ${task.note}`;
        }

        return desc;
      })
      .join("\n\n");
  }

  // Helper function to convert schedule to string format
  private scheduleToString(schedule: Schedule): string {
    if (schedule.length === 0) {
      return "(No planned schedule)";
    }

    return schedule
      .map((block) => {
        return `- ${block.start} to ${block.end}
  Tasks: ${block.taskIdSet.join(", ")}`;
      })
      .join("\n\n");
  }

  // Helper function to convert routine to string format
  private routineToString(routine: Routine): string {
    if (routine.length === 0) {
      return "(No recorded routine)";
    }

    return routine
      .map((session) => {
        let desc = `- ${session.sessionName} (ID: ${session.sessionId})
  Active: ${session.isActive}, Paused: ${session.isPaused}`;

        if (session.start) {
          desc += `\n  Start: ${session.start}`;
        }
        if (session.end) {
          desc += `\n  End: ${session.end}`;
        }
        if (session.linkedTask) {
          desc += `\n  Linked Task: ${session.linkedTask.taskName}`;
        }
        if (session.interruptReason) {
          desc += `\n  Interrupt Reason: ${session.interruptReason}`;
        }

        return desc;
      })
      .join("\n\n");
  }

  // Helper function to convert adaptive blocks to string format
  private adaptiveBlocksToString(owner: User): string {
    const blocks = this.adaptiveBlocks.filter((b) => b.owner === owner);

    if (blocks.length === 0) {
      return "(No existing adaptive blocks)";
    }

    return blocks
      .map((block) => {
        return `- ${block.timeBlockId}: ${block.start} to ${block.end}
  Tasks: ${block.taskSet.map((t) => t.taskName).join(", ")}`;
      })
      .join("\n\n");
  }

  // Display the adaptive schedule in a readable format
  displayAdaptiveSchedule(owner: User, originalSchedule?: Schedule, currentTime?: string, actualRoutine?: Routine, allTasks?: Task[], userPreferences?: Preference): void {
    const blocks = this.getAdaptiveSchedule(owner);
    const droppedTaskIds = this.getDroppedTaskIds(owner);

    console.log(`\n📅 Schedule Comparison for ${owner}`);
    console.log("==========================================");

    // Display current time if provided
    if (currentTime) {
      const currentDate = new Date(currentTime);
      console.log(`\n⏰ Current Time: ${this.formatTimestamp(currentDate)} (${currentTime})`);
      console.log("==========================================");
    }

    // Display user preferences if provided
    if (userPreferences && userPreferences.preferences.length > 0) {
      console.log("\n👤 User Preferences:");
      console.log("------------------------------------------");
      userPreferences.preferences.forEach((pref, index) => {
        console.log(`   ${index + 1}. ${pref}`);
      });
      console.log("\n==========================================");
    }

    // Display original planned schedule if provided
    if (originalSchedule && originalSchedule.length > 0) {
      const userSchedule = originalSchedule.filter(block => block.owner === owner);
      if (userSchedule.length > 0) {
        console.log("\n📋 Original Planned Schedule:");
        console.log("------------------------------------------");

        // Create task lookup map if tasks are provided
        const taskMap = new Map<string, Task>();
        if (allTasks) {
          for (const task of allTasks) {
            taskMap.set(task.taskId, task);
          }
        }

        const sortedOriginal = userSchedule.sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );

        for (const block of sortedOriginal) {
          const startDate = new Date(block.start);
          const endDate = new Date(block.end);

          console.log(
            `\n⏰ ${this.formatTimestamp(startDate)} - ${this.formatTimestamp(endDate)}`
          );
          console.log(`   Block ID: ${block.timeBlockId}`);

          if (block.taskIdSet.length === 0) {
            console.log("   (No tasks assigned)");
          } else {
            console.log("   Tasks:");
            for (const taskId of block.taskIdSet) {
              const task = taskMap.get(taskId);
              if (task) {
                console.log(
                  `   - ${task.taskName} (Priority: ${task.priority}, Duration: ${task.duration} min)`
                );
              } else {
                console.log(`   - Task ID: ${taskId} (details not available)`);
              }
            }
          }
        }
        console.log("\n==========================================");
      }
    }

    // Display actual routine if provided
    if (actualRoutine && actualRoutine.length > 0) {
      const userRoutine = actualRoutine.filter(session => session.owner === owner);
      if (userRoutine.length > 0) {
        console.log("\n📊 Actual Routine (What Actually Happened):");
        console.log("------------------------------------------");

        const sortedRoutine = userRoutine.sort(
          (a, b) => {
            const aTime = a.start ? new Date(a.start).getTime() : 0;
            const bTime = b.start ? new Date(b.start).getTime() : 0;
            return aTime - bTime;
          }
        );

        for (const session of sortedRoutine) {
          if (session.start && session.end) {
            const startDate = new Date(session.start);
            const endDate = new Date(session.end);

            console.log(
              `\n⏰ ${this.formatTimestamp(startDate)} - ${this.formatTimestamp(endDate)}`
            );
          }
          console.log(`   Session: ${session.sessionName}`);
          console.log(`   Status: ${session.isActive ? 'Active' : 'Inactive'}${session.isPaused ? ', Paused' : ''}`);

          if (session.linkedTask) {
            console.log(`   Linked Task: ${session.linkedTask.taskName}`);
          }

          if (session.interruptReason) {
            console.log(`   Interrupt Reason: ${session.interruptReason}`);
          }
        }
        console.log("\n==========================================");
      }
    }

    // Display adaptive schedule
    console.log("\n🔄 Adaptive Schedule:");
    console.log("------------------------------------------");

    if (blocks.length === 0) {
      console.log("No adaptive blocks scheduled yet.");
    } else {
      // Sort blocks by start time
      const sortedBlocks = blocks.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );

      for (const block of sortedBlocks) {
        const startDate = new Date(block.start);
        const endDate = new Date(block.end);

        console.log(
          `\n⏰ ${this.formatTimestamp(startDate)} - ${this.formatTimestamp(
            endDate
          )}`
        );
        console.log(`   Block ID: ${block.timeBlockId}`);

        if (block.taskSet.length === 0) {
          console.log("   (No tasks assigned)");
        } else {
          console.log("   Tasks:");
          for (const task of block.taskSet) {
            console.log(
              `   - ${task.taskName} (Priority: ${task.priority}, Duration: ${task.duration} min)`
            );
          }
        }
      }
    }

    // Display dropped tasks if any
    console.log("\n🗑️ Dropped Tasks:");
    console.log("==========================================");

    if (droppedTaskIds.length > 0) {
      if (allTasks) {
        // Show full task details if tasks are provided
        droppedTaskIds.forEach((taskId) => {
          const task = allTasks.find(t => t.taskId === taskId);
          if (task) {
            console.log(`\n   ❌ ${task.taskName}`);
            console.log(`      Priority: ${task.priority} (${task.priority === 1 ? 'Critical' : task.priority === 2 ? 'Important' : task.priority === 3 ? 'Regular' : task.priority === 4 ? 'Low' : 'Optional'})`);
            console.log(`      Duration: ${task.duration} minutes`);
            if (task.deadline) {
              console.log(`      Deadline: ${task.deadline}`);
            }
            console.log(`      Reason: Insufficient time to schedule`);
          } else {
            console.log(`   - Task ID: ${taskId} (details not available)`);
          }
        });
      } else {
        // Just show task IDs if task details aren't available
        droppedTaskIds.forEach((taskId) => {
          console.log(`   - Task ID: ${taskId}`);
        });
      }
    } else {
      console.log("   ✅ No tasks were dropped - all tasks successfully scheduled!");
    }
  }

  // Format timestamp to readable string (using UTC time)
  private formatTimestamp(date: Date): string {
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period} UTC`;
  }
}
