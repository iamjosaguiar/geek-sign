# OpenSpec + beads Integration Guide

## How OpenSpec and beads Work Together

### OpenSpec = Planning Layer (WHAT to build)
- Define requirements and specifications
- Create change proposals with acceptance criteria
- Document technical design decisions
- Maintain project context and conventions

### beads = Execution Layer (HOW to track implementation)
- Track implementation tasks as git-backed issues
- Manage dependencies between tasks
- Monitor progress and blockers
- Provide audit trail of work completed

## Workflow Integration

```
1. PLAN (OpenSpec)
   ├─ Create change proposal
   ├─ Write specs with requirements & scenarios
   ├─ Define implementation tasks
   └─ Get approval from stakeholders

2. TRACK (beads)
   ├─ Import tasks as issues
   ├─ Add dependencies (blocks, parent-child)
   ├─ Query ready work (bd ready)
   └─ Track execution progress

3. IMPLEMENT (Code)
   ├─ Pick ready task from beads
   ├─ Reference specs from OpenSpec
   ├─ Write code following requirements
   └─ Mark task complete in beads

4. ARCHIVE (OpenSpec)
   ├─ Update source specs from deltas
   ├─ Move change to archive
   └─ Close epic in beads
```

## Example: Workflow Automation Feature

### Phase 1: Planning with OpenSpec

**Location**: `openspec/changes/add-workflow-automation/`

**Files Created**:
- `proposal.md` - Why we need it, business value, alternatives
- `tasks.md` - 14 implementation sections, 70+ subtasks
- `specs/workflow-engine/spec.md` - Core engine requirements
- `specs/workflow-api/spec.md` - REST API requirements

**Key Specs**:
- Workflow Definition: YAML/JSON schema with versioning
- Workflow Execution: Async execution with state persistence
- Conditional Routing: Route based on field values
- Approval Gates: Multi-approver support (any/all/majority)
- Event Triggers: Document lifecycle events
- Error Handling: Retry with exponential backoff

### Phase 2: Tracking with beads

**Created Issues**:
```bash
bd list --json | jq '.[] | "\(.id): \(.title) [P\(.priority // 0)]"'

geek-sign-1ba: Workflow Automation - Epic [P0]
geek-sign-mtk: Database Schema for Workflows [P1]
geek-sign-8an: Workflow Engine Core Implementation [P1]
geek-sign-l4n: Workflow Definition Schema [P2]
geek-sign-6qr: Conditional Logic Engine [P2]
geek-sign-558: Approval Gate System [P2]
geek-sign-uyu: Event System Integration [P2]
geek-sign-1gp: Workflow Builder UI [P2]
geek-sign-hxq: Workflow Execution Dashboard [P3]
geek-sign-bhh: Workflow API Routes [P1]
geek-sign-yj8: Background Job System [P2]
geek-sign-buo: Template Workflows Library [P3]
geek-sign-tjc: Testing Suite for Workflows [P2]
geek-sign-a31: Workflow Documentation [P3]
geek-sign-awk: Migration and Rollout [P3]
```

**Dependencies Configured**:
- Core engine depends on database schema
- All features depend on core engine
- API routes depend on database + engine
- Background jobs depend on API routes
- Testing depends on engine + API
- Rollout depends on testing + docs

**Ready Work**:
```bash
bd ready --json | jq -r '.[] | .title'

Workflow Automation - Epic
Database Schema for Workflows
Workflow Definition Schema
Workflow Execution Dashboard
```

### Phase 3: Implementation Example

**Starting Work on Database Schema**:
```bash
# 1. Claim the task
bd update geek-sign-mtk --status in_progress

# 2. Reference OpenSpec for requirements
cat openspec/changes/add-workflow-automation/tasks.md | grep -A 5 "## 1. Database"

# 3. Implement (create migration, update schema.ts, etc.)
# ... write code ...

# 4. Mark complete
bd close geek-sign-mtk --reason "Database schema implemented and migrated"

# 5. Check what's ready next
bd ready
# Now shows: Workflow Engine Core Implementation
```

**Discovering New Work**:
```bash
# While implementing engine, discover optimization need
bd create "Add workflow execution caching" \
  --description="Cache workflow definitions to avoid repeated DB queries" \
  -t task -p 2 \
  --deps discovered-from:geek-sign-8an
```

## Benefits of Integration

### 1. **Clear Separation of Concerns**
- OpenSpec: "What does success look like?"
- beads: "What's blocking us from shipping?"

### 2. **Git-Backed Everything**
- OpenSpec specs in `openspec/`
- beads issues in `.beads/issues.jsonl`
- Both version controlled, reviewable, mergeable

### 3. **Dependency-Aware Execution**
- beads ensures correct task ordering
- `bd ready` only shows unblocked work
- Visual dependency trees with `bd dep tree`

### 4. **Audit Trail**
- OpenSpec: Why decisions were made
- beads: When work was completed, by whom

### 5. **AI-Friendly Workflow**
- OpenSpec: Specs written for AI agents
- beads: Tasks optimized for AI execution
- Both provide `--json` for programmatic access

## Best Practices

### 1. One OpenSpec Change = One beads Epic
```bash
# Create epic for the OpenSpec change
bd create "Workflow Automation - Epic" \
  --description="See openspec/changes/add-workflow-automation/" \
  -t epic -p 0

# Link all implementation tasks to epic
bd create "Database Schema" --deps parent-child:epic-id
```

### 2. Reference OpenSpec from beads
```bash
# Always include pointer to specs in description
bd create "Implement approval gates" \
  --description="See openspec/changes/add-workflow-automation/specs/workflow-engine/spec.md#approval-gates"
```

### 3. Use beads Priority to Match OpenSpec Importance
- P0 = Critical path items
- P1 = High-value features
- P2 = Nice-to-have enhancements
- P3 = Polish and documentation

### 4. Sync Regularly
```bash
# After creating/updating issues
bd sync

# This commits to git, so changes are saved
```

### 5. Query for Planning
```bash
# How many tasks total?
bd list --json | jq 'length'

# How many per priority?
bd list --json | jq 'group_by(.priority) | map({priority: .[0].priority, count: length})'

# What's blocking the most work?
bd list --json | jq '.[] | select(.blockers | length > 0)'
```

## Commands Cheat Sheet

### OpenSpec
```bash
openspec init                      # Initialize in project
openspec list                      # Show active changes
openspec show <change-id>          # View change details
openspec validate <change-id>      # Validate specs
openspec archive <change-id> --yes # Archive completed change
```

### beads
```bash
bd create "Title" -t task -p 1 --deps parent-child:epic-id
bd list --status open --priority 1
bd ready                           # Show unblocked work
bd update <id> --status in_progress
bd close <id> --reason "Done"
bd dep tree <id>                   # Visualize dependencies
bd sync                            # Commit to git
```

### Integration
```bash
# 1. Create OpenSpec proposal
mkdir -p openspec/changes/add-feature
# ... write proposal.md, tasks.md, specs/ ...

# 2. Create beads epic
bd create "Feature Name - Epic" -t epic -p 0

# 3. Import tasks from OpenSpec
bd create "Task 1" --deps parent-child:<epic-id>
bd create "Task 2" --deps parent-child:<epic-id>,blocks:<task-1-id>

# 4. Work through tasks
bd ready
bd update <id> --status in_progress
# ... implement ...
bd close <id>

# 5. Archive when complete
openspec archive add-feature --yes
bd close <epic-id> --reason "Shipped to production"
```

## Next Steps

1. **Review the proposal**: `openspec/changes/add-workflow-automation/proposal.md`
2. **Understand the specs**: Read `specs/workflow-engine/spec.md` and `specs/workflow-api/spec.md`
3. **Start with ready work**: `bd ready` shows tasks you can start now
4. **Track progress**: Use `bd list` to see all tasks, `bd dep tree` for visualization

## Resources

- **OpenSpec Docs**: `OpenSpec/README.md`
- **beads Docs**: `beads/README.md`
- **Project Context**: `openspec/project.md`
- **Current Tasks**: `.beads/issues.jsonl` (git-tracked)
