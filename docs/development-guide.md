# skynet — Development Guide

**Date:** 2026-05-26  
**Scope:** BMAD planning workspace (pre-implementation)

## Overview

This repository is currently a **planning and documentation workspace**, not a runnable application. Development activity centers on BMAD Method workflows, PRD iteration, and AI-assisted analysis until implementation begins.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.12+ | BMAD customization scripts |
| Cursor (or compatible IDE) | Latest | Agent skills in `.agents/skills/` |
| Git | Any recent | Version control |

### Python on Windows

If `python3` is not on PATH after install:

```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" --version
```

Use the full path for BMAD scripts until PATH is refreshed in a new terminal.

## Environment Setup

1. Clone or open the repository at `d:\abi\skynet`
2. Verify BMAD config:

```powershell
Get-Content _bmad\bmm\config.yaml
```

Key values:
- `project_name`: skynet
- `planning_artifacts`: `output/planning-artifacts`
- `project_knowledge`: `docs`
- `output_folder`: `output`

3. Confirm agent skills are present:

```powershell
Get-ChildItem .agents\skills -Directory | Select-Object -First 10 Name
```

## BMAD Workflow Commands

### Resolve skill customization

```powershell
$py = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
& $py "_bmad\scripts\resolve_customization.py" `
  --skill ".agents\skills\bmad-agent-tech-writer" `
  --key agent
```

### Common skills (invoke via Cursor agent)

| Skill | Purpose |
|-------|---------|
| `bmad-document-project` | Generate brownfield docs → `docs/` |
| `bmad-generate-project-context` | AI agent rules → `output/project-context.md` |
| `bmad-create-prd` / `bmad-edit-prd` | PRD workflows |
| `bmad-create-architecture` | Technical architecture (next recommended step) |
| `bmad-agent-tech-writer` | Paige — documentation specialist |
| `bmad-help` | Workflow guidance |

## Project Layout Conventions

| Path | Use |
|------|-----|
| `output/planning-artifacts/` | PRDs, research, architecture docs |
| `output/implementation-artifacts/` | Stories, sprint artifacts (when coding starts) |
| `docs/` | Generated project documentation index |
| `output/project-context.md` | Rules for AI code generation |
| `design-artifacts/` | WDS UX/design phase outputs |

## Working with the PRD

Primary product spec:

```
output/planning-artifacts/prd/skynet-drone-services/prd.md
output/planning-artifacts/prd/skynet-drone-services/.decision-log.md
```

When making product changes, update the PRD and append decisions to `.decision-log.md`.

## When Implementation Begins

Expected first steps:

1. Run **`bmad-create-architecture`** to select and document tech stack
2. Scaffold application directories (e.g., `apps/farmer-mobile`, `apps/pilot-mobile`, `services/api`)
3. Add package manifests (`package.json`, `pubspec.yaml`, etc.)
4. Re-run **`bmad-document-project`** with **Deep Scan** to generate:
   - `api-contracts.md`
   - `data-models.md`
   - `component-inventory.md`
5. Complete **`bmad-generate-project-context`** for AI coding rules

## Testing

No test suite exists yet. BMAD TEA module skills are available for test architecture when code lands:

- `bmad-testarch-framework`
- `bmad-testarch-test-design`
- `bmad-qa-generate-e2e-tests`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `python3` not found | Use full path to Python 3.12 executable |
| Skill not loading | Check `.agents/skills/<skill-name>/SKILL.md` exists |
| Config paths wrong | Edit `_bmad/bmm/config.yaml` or `_bmad/custom/` overrides |

---

_Generated using BMAD Method `document-project` workflow_
