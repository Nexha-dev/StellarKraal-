# Local Development Setup Guide (Non-Docker)

This guide walks you through setting up the StellarKraal environment for local development without using Docker. This approach is recommended for faster iteration and debugging.

## Prerequisites

Ensure you have the following installed on your machine before you begin:

*   **Node.js**: v20 or higher
*   **npm**: Included with Node.js
*   **Rust**: Latest stable version (via `rustup`)
*   **Stellar CLI**: Installed via cargo
*   **Freighter Wallet**: Browser extension for testing the frontend
*   **SQLite**: Required for the backend database

### Platform-Specific Notes

#### macOS
*   Install Xcode Command Line Tools: `xcode-select --install`
*   Install SQLite via Homebrew (optional, usually pre-installed): `brew install sqlite`

#### Linux (Ubuntu/Debian)
*   Install build essentials and SQLite: `sudo apt update && sudo apt install build-essential libssl-dev pkg-config sqlite3 libsqlite3-dev`

#### Windows (WSL2)
*   **Important**: We highly recommend using WSL2 (Windows Subsystem for Linux) running an Ubuntu distribution.
*   Do not develop directly in the Windows filesystem; clone the repository into your WSL2 home directory (e.g., `~/StellarKraal-`).
*   Follow the Linux (Ubuntu/Debian) notes above inside your WSL2 terminal.

---

## 1. Environment Configuration

Clone the repository and set up the environment variables.

```bash
git clone https://github.com/<your-username>/StellarKraal-.git
cd StellarKraal-
cp env.example .env
```

Ensure your `.env` file contains the correct values. The defaults in `env.example` are usually sufficient for local development.

---

## 2. Smart Contract Setup

The smart contracts are written in Rust using the Soroban SDK.

### Setup Rust Toolchain

1.  Add the `wasm32-unknown-unknown` target:
    ```bash
    rustup target add wasm32-unknown-unknown
    ```
2.  Install the Stellar CLI:
    ```bash
    cargo install --locked stellar-cli --features opt
    ```

### Build and Test

Navigate to the contract directory and build/test the contract:

```bash
cd contracts/stellarkraal
cargo build --target wasm32-unknown-unknown --release
cargo test
```

---

## 3. Backend Setup

The backend is a Node.js + TypeScript Express application using SQLite as the database.

### Setup

Navigate back to the project root and into the backend directory:

```bash
cd ../../backend
npm install
```

### Database Migration

The backend uses `db-migrate` for SQLite database migrations. Run the development migrations:

```bash
npm run migrate:dev
```
*Note: This will create a `database.sqlite` (or similarly named) file in your backend directory as configured by `database.json`.*

### Run the Backend

Start the development server:

```bash
npm run dev
```

The backend API will be available at `http://localhost:3001` (or the port specified in your `.env` file).

---

## 4. Frontend Setup

The frontend is built with React, Next.js 14, and Tailwind CSS.

### Setup

Open a new terminal window, navigate to the frontend directory:

```bash
cd frontend
npm install
```

### Run the Frontend

Start the Next.js development server:

```bash
npm run dev
```

The frontend application will be available at `http://localhost:3000`.

---

## Common Setup Errors and Solutions

### Node.js / NPM Issues
*   **Error:** `npm ERR! code ERESOLVE` or dependency conflicts.
    *   **Solution:** Ensure you are using Node.js v20+. If the issue persists, try deleting `node_modules` and `package-lock.json`, then run `npm install` again.

### Backend Issues
*   **Error:** `Error: sqlite3 module not found` or `Error: Cannot find module 'sqlite3'`.
    *   **Solution:** This typically happens if `sqlite3` failed to build for your architecture. Ensure you have the necessary build tools (see Platform-Specific Notes). Try running `npm rebuild sqlite3` in the `backend` directory.
*   **Error:** `PORT already in use`.
    *   **Solution:** Another service is using port 3001. Stop that service or change the `PORT` variable in your `.env` file.

### Smart Contract / Rust Issues
*   **Error:** `error: failed to run custom build command for 'soroban-env-host'`.
    *   **Solution:** Ensure you have the `wasm32-unknown-unknown` target installed (`rustup target add wasm32-unknown-unknown`).
*   **Error:** `stellar: command not found`.
    *   **Solution:** Ensure `~/.cargo/bin` is added to your system's `PATH`.

### Frontend Issues
*   **Error:** API requests from frontend failing with `CORS policy`.
    *   **Solution:** Ensure `FRONTEND_URL=http://localhost:3000` is set in your `.env` file and the backend server is running.
