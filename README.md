<!-- =====================================================
     Story Master
===================================================== -->

<p align="center">
  <!-- Replace the src once you add the logo image to the repo -->
  <img src="./public/images/logo.png" alt="Story Master logo" width="320" />
</p>

<h1 align="center">Story Master</h1>

<p align="center">
  A focused workspace for managing game development ideas, stories, lore,
  inspiration, and world-building notes — all in one place.
</p>

---

## ✨ What is Story Master?

**Story Master** is an open-source, work-in-progress web application designed to help game developers and writers:

- Capture story ideas quickly
- Organize lore, characters, worlds, and concepts
- Store inspiration links, references, and notes
- Keep everything accessible across devices (planned)

The goal is a **distraction-free, writing-first experience**, built with modern web tools and a calm, readable UI.

---

## 🧰 Tech Stack

- **React 18**
- **Vite** (fast dev + build)
- **TypeScript**
- **Material UI (MUI)** with custom theming
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

### Start development server

`pnpm run dev`

This starts Vite’s development server (usually at http://localhost:5173) with fast hot-module reload.

### 📜 Available Scripts

---

`pnpm run dev`

Starts the development server using Vite.
- Fast startup
- Hot module replacement
- Intended for local development

---

`pnpm run build`

Builds the project for production.
- Runs TypeScript build (tsc -b)
- Builds optimized production assets via Vite
- Output is written to the dist/ directory

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
- Cross-device synchronization

### 📄 License

This project is licensed under the MIT License.

See the LICENSE￼ file for details.

### ✍️ Author

Martin Metaksov

--- 

Story Master is still in early development.
Ideas, feedback, and discussion are welcome as the project evolves.