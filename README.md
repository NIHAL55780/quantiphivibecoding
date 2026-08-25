# Subscription Tracker & Renewal Dashboard

A full-stack personal finance dashboard for tracking recurring SaaS and streaming
subscriptions, their monthly burn rate, and upcoming renewals.

All financial and date calculations are performed server-side. The frontend renders
values returned by the API and never computes costs or renewal windows itself.

## Tech Stack

| Layer    | Technology                     |
| -------- | ------------------------------ |
| Frontend | React 18 + Vite                |
| Backend  | Node.js + Express              |
| Database | SQLite (via better-sqlite3)    |
| Tests    | Node built-in test runner      |

## Project Structure

```
project/
├── backend/          Express API, business logic, SQLite persistence
├── frontend/         React dashboard UI
└── README.md
```

## Setup

Setup and run instructions are documented at the end of implementation.

## Status

Work in progress.
