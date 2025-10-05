<concept_spec>
concept AdaptiveSchedule [User, Task, Schedule, Routine]

purpose
    keeps the schedule responsive by moving, canceling, or creating tasks scheduled at future time blocks when reality diverges to ensure that highest priority tasks are achieved first, optimizing productivity

principle
    when actual sessions overruns or diverges from the plan, the adaptive scheduler adjusts subsequent planned tasks onto adaptive time blocks;
    then, the user can observe the adaptively adjusted schedule

state
    a set of AdaptiveBlock with
        a timeBlockId String // this is a unique id
        an owner User
        a start Time // timestamp in ISO format
        an end Time // timestamp in ISO format
        a taskSet set of Task // tasks assigned to this block

    a map of droppedTaskIds from User to set of String
        // tasks that couldn't be scheduled due to insufficient time
        // key: User, value: set of task IDs

    invariants
        every adaptive block has a unique timeBlockId
        start time is before end time
        each adaptive block has exactly one owner
        dropped task IDs are valid task identifiers

actions
    addTimeBlock(owner: User, start: Time, end: Time): String
        requires:
            start and end are valid times;
            start is before end;
        effect:
            creates a new adaptive time block with this owner, start, and end;
            assigns an empty set of tasks;
            returns the unique timeBlockId

    async requestAdaptiveScheduleAI(owner: User, tasks: set of Task, schedule: Schedule, routine: Routine, preference: Preference, llm: GeminiLLM): set of AdaptiveBlock
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

    unassignBlock(owner: User, taskId: String, timeBlockId: String)
        requires:
            exists an adaptive block with matching owner and timeBlockId;
            task with taskId exists in this time block's taskSet;
        effect:
            removes task from that block's taskSet

    getAdaptiveSchedule(owner: User): set of AdaptiveBlock
        effect:
            returns all adaptive blocks owned by the user

    getDroppedTaskIds(owner: User): set of String
        effect:
            returns all dropped task IDs for the user (tasks that couldn't be scheduled due to insufficient time)

notes
    This concept demonstrates AI augmentation for adaptive scheduling.
    The LLM enables flexible reasoning about schedule deviations and contextual task prioritization.

    Task, Schedule, and Routine are generic types:
    - Task: Contains taskId, taskName, category, duration, priority, splittable flag, deadline, slack, dependencies, and notes
    - Schedule: Contains planned time blocks with taskIdSet
    - Routine: Contains actual recorded sessions with start/end times, linked tasks, and interruption reasons

    Preference is a hardwired set of user scheduling preferences passed to the LLM.
</concept_spec>
