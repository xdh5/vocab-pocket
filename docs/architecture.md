# Architecture

## Runtime

```text
Windows UI Automation
        │
        ▼
Electron hover controller ──► ECDICT offline lookup
        │
        ├──► Hover React window
        │
        └──► FastAPI ──► service ──► repository ──► SQLite
                         ▲
Main React window ───────┘
```

Electron only owns operating-system capabilities. React owns presentation and interaction. FastAPI owns vocabulary business rules and persistence.

DeepSeek is called only by FastAPI. The API key stays in backend configuration, and validated structured word cards are persisted in SQLite before being returned to React.

The React entry selects the PC word bank for `/` and the mobile review PWA for `/mobile`. Both surfaces share the same FastAPI word resource. Mobile review actions advance an eight-stage spaced-repetition schedule in SQLite; re-adding or forgetting a word resets its mastery stage. HTTPS deployments use same-origin API requests, while local-network development targets port 8000 on the PC host.

The Electron dictionary resolves an encountered inflection to its ECDICT lemma before it reaches FastAPI. FastAPI stores the encounter immediately, returns the pending word card, and runs Doubao enrichment and optional image retrieval in a background task using the canonical headword only. The PC client polls pending cards until enrichment completes.

## Backend boundaries

- `api`: HTTP transport and dependency injection only.
- `schemas`: validated request and response contracts.
- `services`: encounter counting and learning-mode rules.
- `repositories`: SQLAlchemy queries and transactions.
- `models`: persistence entities.
- `db`: engine, sessions and Alembic startup.

The reading mode implies listening/speaking. Recording listening/speaking never removes an existing reading flag. Every accepted record operation increments `add_count`.

## Desktop boundaries

- `local-api`: starts and calls the packaged FastAPI process.
- `settings-store`: persists desktop preferences.
- `dictionary`: converts ECDICT entries into compact meanings.
- `window-manager`: owns main and hover BrowserWindows.
- `hover-controller`: polls the pointer and coordinates lookup/display.
- `main`: wires modules to Electron lifecycle, tray and IPC.

## Database lifecycle

Alembic is the source of truth for schema changes. The application upgrades to the latest revision during FastAPI startup. New schema changes must be represented by a new migration rather than runtime `ALTER TABLE` statements.
