<concept_spec>
concept AdaptiveSchedule [User, Task, Schedule, Routine]

purpose
   keeps the schedule responsive by moving, canceling, or creating tasks scheduled at future time blocks when reality diverges, ensuring that highest-priority tasks are achieved first while preserving user productivity.


principle
   when actual sessions overrun or diverge from the plan, the adaptive scheduler adjusts subsequent planned tasks into adaptive time blocks;
   this process can operate in two modes:
   (1) Manual mode — user reviews deviations and adjusts future time blocks;
   (2) AI-augmented mode — an LLM analyzes deviations, infers likely causes, and automatically proposes a revised schedule for future tasks;

state
   a set of AdaptiveBlocks with
      a timeBlockId String // this is a unique id
      an owner User
      a start Time
      an end Time
      a taskSet set of Tasks

   a set of droppedTasks with
      a task Task
      an owner User

invariants
   every adaptive block has a unique timeBlockId;
   start time is of every adaptive block is before end time;
   every adaptive block has exactly one owner;
   only one adaptive block exists given (owner, start, end);
   every task in each adaptive block's taskSet is unique;

actions
   addTimeBlock (owner: User, start: Time, end: Time) : (timeBlockId: String)
      requires:
         start and end are valid times;
         start is before end;
         no adaptive time block exists with this owner, start, and end;
      effect:
         create a new adaptive time block b with this owner, start, and end;
         assign b an empty set of tasks;
         return b.timeBlockId;
   
   assignAdaptiveSchedule (owner: User, timeBlockId: String, task: Task):
      requires:
         adaptive block exists with the matching owner and timeBlockId;
         task not in this adaptive block's taskSet;
      effect:
         add task to this adaptive block's taskSet;

   async requestAdaptiveScheduleAI (owner: User, tasks: set of Tasks, schedule: Schedule, routine: Routine, preference: Preference, llm: GeminiLLM): (adaptiveBlock: AdaptiveBlock, droppedTasks: set of Tasks)
      effect:
         1. sends a structured prompt to the LLM summarizing current tasks, planned schedule, actual routine, and user preferences;
         2. LLM analyzes discrepancies between plan and routine, infers causes (e.g., overruns, interruptions, missing focus periods).
         3. LLM generates an adaptive schedule proposal, and it:
              - assigns or splits tasks across AdaptiveBlocks,
              - respects task deadlines, durations, and dependencies,
              - applies user preferences,
              - considers other adaptive blocks owned by the user,
              - drops tasks if time is insufficient.
         4. LLM returns a structured JSON response including:
              - adaptiveBlocks (with start/end times and assigned tasks)
              - droppedTasks (tasks removed due to insufficient time)
              - brief reasoning summary for user transparency.
         5. The system validates the output for logical consistency (e.g., no overlapping blocks, no hallucinated tasks).
         6. The system assign each task to the LLM suggested adaptive block (similar to assignAdaptiveSchedule action). The system also add the droppedTasks to state.
         7. Return the set of all AdaptiveBlocks under this owner. Also return the set of all droppedTasks under this owner.

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

   getDroppedTask(owner: User): (set of droppedTasks)
      requires:
         exists at least one dropped task with this user
      effect:
         returns all dropped task for the user (tasks that couldn't be scheduled due to insufficient time)
         
Note:
- For more details, check README.md
</concept_spec>