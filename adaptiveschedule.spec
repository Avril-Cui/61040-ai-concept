<concept_spec>
concept AdaptiveSchedule [User, Task, Schedule, Routine]

purpose
    keeps the schedule responsive by moving, canceling, or creating tasks scheduled at future time blocks when reality diverges to ensure that highest priority tasks are achieved first, optimizing productivity

principle
    when actual sessions overruns or diverges from the plan, the adaptive scheduler adjusts subsequent planned tasks onto adaptive time blocks;
    then, the user can observe the adaptively adjusted schedule

state
    a set of AdaptiveBlocks with
        a timeBlockId String // this is a unique id
        an owner User
        a start Time
        an end Time
        a taskSet set of Task

    a set of droppedTasks with
        a taskId String

invariants
   every adaptive block has a unique timeBlockId
   start time is before end time
   each adaptive block has exactly one owner
   dropped task IDs are valid task identifiers

actions
   addTimeBlock (owner: User, start: Time, end: Time) : (timeBlockId: String)
      requires:
         start and end are valid times;
         start is before end;
         no adaptive time block exists with this owner, start, and end;
      effect:
         create a new adaptive time block b with this owner, start, and end;
         assign b an empty set of tasks;
         return the unique timeBlockId of b;

   createAdaptiveSchedule (owner: User, tasks: set of Task, schedule: Schedule, routine: Routine)
      effect:
         based on (task, schedule, and routine), adaptively generate a new schedule of tasks by assigning active tasks to taskSet of the corresponding AdaptiveBlock under this owner

   async requestAdaptiveScheduleAI (owner: User, task: Task, schedule: Schedule, routine: Routine, preference: Preference, llm: GeminiLLM): (adaptiveBlock: AdaptiveBlock)
      effect:
         AI-assisted adaptive scheduling where LLM analyzes the difference between schedule and routine;
         reasons about possible causes of deviation;
         considers hardwired user preferences;
         considers the original planned schedule of tasks;
         considers information provided by attributes in tasks (priority, duration, deadline, dependencies, etc.);
         considers other schedules represented by adaptive blocks owned by the user;
         after reasoning, the LLM assigns tasks to one or more adaptive blocks under this owner;
         if time is insufficient, prioritizes tasks with urgent deadlines or higher priority (1-2);
         drops lower priority tasks (3-5) or tasks without urgent deadlines, storing their IDs in droppedTaskIds;
         returns the set of all AdaptiveBlocks owned by the user;

   unassignBlock (owner: User, task: Task, timeBlockId: String)
      requires:
         exists an adaptive block with matching owner and timeBlockId;
         task exists in this time block's taskSet;
      effect:
         remove task from that block's taskSet

   getAdaptiveSchedule(owner: User): (set of AdaptiveBlock)
        requires:
            exists at least one adaptive block with this owner
        effect:
            returns all adaptive blocks owned by the user

   getDroppedTaskIds(owner: User): (set of String)
      requires:
         exists at least one adaptive block with this owner
      effect:
         returns all dropped task IDs for the user (tasks that couldn't be scheduled due to insufficient time)


         
Note:
- For more details, check README.md
</concept_spec>