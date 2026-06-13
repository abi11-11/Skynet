# skynet - Source Tree Analysis

**Date:** 2026-05-26

## Overview

This repository is a **BMAD Method planning workspace** for the Skynet Drone Services platform. There is no `src/`, `app/`, or application package manifest — the tree is organized around planning artifacts, agent skills, and BMAD configuration.

## Complete Directory Structure

```
skynet/
├── _bmad/                          # BMAD Method installation
│   ├── bmm/                        # BMM module (config.yaml, workflows)
│   ├── cis/                        # Creative Innovation Suite
│   ├── core/                       # Core BMAD config
│   ├── custom/                     # Team/user customization overrides
│   ├── scripts/                    # Python utilities (resolve_customization.py)
│   ├── tea/                        # Test architecture module
│   └── wds/                        # Workflow Design System module
├── .agents/skills/                 # Cursor agent skills (80+ BMAD skills)
├── .agent/skills/                  # Alternate skill install path
├── .claude/skills/                 # Claude skill install path
├── .github/agents/                 # GitHub agent definitions
├── design-artifacts/               # WDS design workflow folders
│   ├── A-Product-Brief/
│   ├── B-Trigger-Map/
│   ├── C-UX-Scenarios/
│   ├── D-Design-System/
│   └── E-Development/
├── docs/                           # ← Generated documentation (this scan)
├── output/                         # Planning & implementation artifacts
│   ├── brainstorming/
│   ├── implementation-artifacts/
│   ├── planning-artifacts/
│   │   ├── prd/skynet-drone-services/
│   │   └── research/
│   ├── project-context.md          # AI agent rules stub
│   └── test-artifacts/
└── _bmad/config.toml               # Root BMAD configuration
```

## Critical Directories

### `_bmad/`

**Purpose:** BMAD Method framework — configuration, workflow definitions, and Python resolver scripts.  
**Contains:** `bmm/config.yaml` (user_name, output paths), module workflows, customization merge logic.  
**Entry Points:** `_bmad/scripts/resolve_customization.py`, `_bmad/scripts/resolve_config.py`

### `output/planning-artifacts/`

**Purpose:** Primary product planning outputs.  
**Contains:**
- `prd/skynet-drone-services/prd.md` — Full product requirements document
- `prd/skynet-drone-services/.decision-log.md` — Architectural and product decisions
- `research/market-drone-services-tamil-nadu-agriculture-research-2026-05-20.md`

### `.agents/skills/`

**Purpose:** AI agent skill definitions for Cursor and compatible tools.  
**Contains:** Skills for PRD creation, architecture, tech writing (Paige), dev stories, testing, etc.

### `design-artifacts/`

**Purpose:** WDS (Workflow Design System) phase folders for UX/design progression.  
**Contains:** Empty scaffolding folders A–E (Product Brief through Development).

### `docs/`

**Purpose:** Brownfield documentation for AI-assisted development.  
**Contains:** Generated docs from this `document-project` scan.

## Entry Points

| Entry | Path | Description |
|-------|------|-------------|
| BMAD config | `_bmad/bmm/config.yaml` | Project name, output paths, languages |
| PRD | `output/planning-artifacts/prd/skynet-drone-services/prd.md` | Product requirements |
| Doc index | `docs/index.md` | Master documentation index |
| Agent rules | `output/project-context.md` | AI implementation rules (in progress) |

## File Organization Patterns

- **Planning artifacts** live under `output/planning-artifacts/` with frontmatter YAML headers
- **Decision tracking** uses sibling `.decision-log.md` files next to PRDs
- **Skills** are duplicated across `.agents/`, `.agent/`, `.claude/` install paths
- **Customization** merges via `_bmad/custom/*.toml` overrides

## Key File Types

| File Type | Pattern | Purpose |
|-----------|---------|---------|
| PRD | `output/**/prd.md` | Product requirements |
| Research | `output/**/research/*.md` | Market/domain research |
| Skill definition | `.agents/skills/*/SKILL.md` | Agent workflow instructions |
| BMAD config | `_bmad/**/config.yaml` | Module configuration |
| Customization | `*/customize.toml` | Skill/agent overrides |

## Configuration Files

- **`_bmad/bmm/config.yaml`** — User name, project name, output folder paths, languages
- **`_bmad/config.toml`** — Root BMAD installer configuration
- **`.agents/skills/*/customize.toml`** — Per-skill workflow/agent customization

## Notes for Development

- **No application code exists yet** — future `src/`, mobile, and backend folders are not present
- When implementation begins, expect a multi-part structure: farmer mobile app, pilot mobile app, platform API
- Re-run `document-project` with **Deep Scan** after first code commit to generate API contracts, data models, and component inventory

---

_Generated using BMAD Method `document-project` workflow_
