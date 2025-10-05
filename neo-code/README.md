# AdaptiveSchedule Concept Implementation

## Overview
This directory contains the implementation of the **AdaptiveSchedule** concept, an AI-augmented scheduling system that adaptively adjusts schedules based on deviations between planned schedules and actual routines.

## File Structure

```
neo-code/
├── adaptiveschedule.spec       # Formal concept specification
├── types.ts                     # Type definitions (state variables)
├── adaptiveschedule.ts         # Concept implementation (back-end logic)
└── adaptiveschedule-tests.ts   # Driver with test cases
```

## Separation of Concerns

### 1. Type Definitions (`types.ts`)
- Contains all state variable type definitions
- Includes: User, Task, TimeBlock, Session, Schedule, Routine, Preference, AdaptiveBlock
- Shared across implementation and tests
- Cleanly separates data structure definitions from logic

### 2. Concept Logic (`adaptiveschedule.ts`)
- Contains all business logic for the AdaptiveSchedule concept
- Implements actions: `addTimeBlock()`, `requestAdaptiveScheduleAI()`, `unassignBlock()`, `getAdaptiveSchedule()`
- Handles state management for adaptive blocks
- Imports types from `types.ts`
- Separated from LLM integration (uses GeminiLLM wrapper from parent directory)

### 3. LLM Wrapper (`../gemini-llm.ts`)
- Reuses the existing GeminiLLM wrapper from the starter code
- Handles all Gemini API communication
- Cleanly separated from concept logic

### 4. Test Driver (`adaptiveschedule-tests.ts`)
- Contains 4 comprehensive test cases
- Demonstrates manual and AI-assisted scheduling
- Tests complex scenarios with dependencies and deadlines
- Properly processes and formats LLM output for console display
- Imports types from `types.ts` and concept class from `adaptiveschedule.ts`

### 5. Concept Specification (`adaptiveschedule.spec`)
- Formal specification following the course format
- Documents purpose, principle, state, actions, and notes
- Separated from implementation code

## Running the Code

### Run all test cases:
```bash
npm start
```
or
```bash
npm test
```

### Run individual test cases:
```bash
npm run adaptive:manual      # Test manual time block creation
npm run adaptive:ai          # Test AI-assisted scheduling
npm run adaptive:complex     # Test complex scenario with dependencies
npm run adaptive:unassign    # Test unassigning tasks
```

### Development mode (no build):
```bash
npm run dev
```

## Security

- API keys are stored in `config.json` (not tracked in git)
- `config.json` is listed in `.gitignore` to prevent secrets from being committed
- Template file `config.json.template` is provided for setup

## Test Cases

### Test 1: Manual Time Block Creation
- Demonstrates creating time blocks manually
- Shows basic state management

### Test 2: AI-Assisted Adaptive Scheduling
- Creates tasks with priorities, deadlines, and preferences
- Provides planned schedule and actual routine (with deviations)
- LLM analyzes deviations and generates adaptive schedule
- Output is processed and nicely formatted to console

### Test 3: Complex Scenario with Dependencies
- Tests task dependencies (preDependence/postDependence)
- Tests deadline constraints
- Tests concurrent task scheduling (e.g., laundry + homework)
- Demonstrates LLM's reasoning about complex constraints

### Test 4: Unassign Blocks
- Tests removing tasks from time blocks
- Demonstrates state mutation actions

## Output Formatting

The implementation processes LLM output and presents it to console with:
- Clear section headers with emojis for readability
- Structured display of adaptive blocks with timestamps
- Task details (name, priority, duration)
- AI analysis and reasoning
- Color-coded status messages (✅ success, ❌ error, ⚠️ warning)

## Concept Features

- **Multi-user support**: Each user has their own adaptive blocks
- **Rich task model**: Supports priorities, deadlines, dependencies, splittable tasks, slack time
- **Deviation analysis**: LLM analyzes why planned schedule deviated from actual routine
- **Preference integration**: Considers user preferences for scheduling
- **Concurrent tasks**: Allows multiple tasks per block when they can be done concurrently
- **Validation**: Comprehensive validation of timestamps, task IDs, and constraints

## AI Augmentation

The LLM enhances the concept by:
1. Analyzing schedule vs routine deviations
2. Reasoning about causes of divergence
3. Considering task priorities, deadlines, and dependencies
4. Applying user preferences
5. Generating optimal adaptive schedules
6. Providing explanations for scheduling decisions

This demonstrates how AI augmentation enables flexible reasoning and contextual synthesis that goes beyond deterministic rule-based logic.
