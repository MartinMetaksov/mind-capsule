<!-- =====================================================
     Mind Capsule
===================================================== -->

<p align="center">
  <!-- Replace the src once you add the logo image to the repo -->
  <img src="./public/images/logo.png" alt="Mind Capsule logo (AI generated)" width="320" />
</p>

<h1 align="center">Mind Capsule</h1>

<p align="center">
  A focused workspace for managing game development ideas, stories, lore,
  inspiration, and world-building notes — all in one place.
</p>

---

## ✨ What is Mind Capsule?

**Mind Capsule** is an open-source, work-in-progress desktop application (built with Tauri) designed to help game developers and writers:

- Capture story ideas quickly
- Organize lore, characters, worlds, and concepts
- Store inspiration links, references, and notes
- Keep everything accessible across devices (planned)

The goal is a **distraction-free, writing-first experience**, built with modern web tools and a calm, readable UI.

While the UI is web-based, Mind Capsule runs as a native desktop app with full local filesystem access.

---

## 🧰 Tech Stack

- **React 18**
- **Vite** (fast dev + build)
- **TypeScript**
- **Tauri** (desktop shell & native APIs)
- **Material UI (MUI)** with custom writing-focused theming
- **Vitest** + Testing Library
- **ESLint (flat config)** + **Prettier**
- **pnpm** for dependency management

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+**
- **pnpm:** `npm install -g pnpm`

### Install dependencies

`pnpm install`

### Start development (web only)

`pnpm run dev`

Starts the Vite dev server in the browser. Useful for fast UI iteration.

### Start desktop app (recommended)

`pnpm run dev:tauri`
Runs the full desktop application using Tauri. This is the primary way to run Mind Capsule.

### 📜 Available Scripts

---

`pnpm run dev`

Starts the development server using Vite.

- Fast startup
- Hot module replacement
- Intended for local development

---

`pnpm run build:tauri`

Builds production-ready desktop binaries.

- Creates native installers/bundles
- Platform-specific output (macOS / Windows / Linux)

---

`pnpm run dev:tauri`

Starts the Mind Capsule desktop application using Tauri.

- Full filesystem access
- Workspace folders
- Native dialogs

---

`pnpm run build`

Builds the **frontend (web) bundle**.

- Runs TypeScript compilation (`tsc -b`)
- Builds optimized production assets via Vite
- Output is written to the `dist/` directory

This command is primarily used for:

- CI validation
- Verifying frontend production builds
- Preparing assets for the Tauri desktop build

> For building the actual desktop application, use `pnpm run build:tauri`.

---

`pnpm run preview`

Serves the production build locally.

- Uses the contents of dist/
- Useful for verifying the final build before deployment

---

`pnpm run test`

Runs the test suite using Vitest.

- JSDOM environment
- Supports watch mode and future UI integrations

---

`pnpm run typecheck`

Runs TypeScript in no-emit mode.

- Ensures full type safety
- Does not generate any output files

---

`pnpm run lint`

Runs ESLint across the project.

- Uses ESLint v9 flat configuration
- Enforces React, TypeScript, and hook rules

---

`pnpm run lint:fix`

Runs ESLint and automatically fixes problems where possible.

---

`pnpm run format`

Formats the entire codebase using Prettier.

- Enforces consistent formatting
- Safe to run at any time

---

## 🗂 Workspace & Data Storage

Mind Capsule uses a **local workspace folder** as its primary data store.

- Projects, notes, images, and assets are stored as real files
- Long-form content is stored as Markdown
- Metadata is stored as JSON
- No hidden database — everything is portable and readable

This approach allows:

- Easy backups
- Git / Dropbox / iCloud syncing
- Manual editing if desired
- Future-proof storage

The workspace folder is selected on first launch and can be changed later.

### 🧪 Quality & CI

This repository uses GitHub Actions for continuous integration.

On every push and pull request, the CI pipeline automatically:

- Installs dependencies
- Runs TypeScript type checks
- Lints the codebase
- Executes tests
- Builds the project

This ensures the main branch stays healthy and deployable.

### 🧭 Roadmap (early, subject to change)

- Story / lore data model
- Tagging and search
- Rich text / markdown editor
- Focus / writing mode
- Offline-first storage

### 📄 License

This project is licensed under the MIT License.

See the [LICENSE](./LICENSE) file for details.

### ✍️ Author

Martin Metaksov

---

Mind Capsule is still in early development.
Ideas, feedback, and discussion are welcome as the project evolves.
