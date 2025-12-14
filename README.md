# Nostradamus UI

Frontend for the Nostradamus master’s thesis project.

Built with SvelteKit. This app provides a minimal UI for managing fields and inspecting sensor-related data via a JSON API.

## Overview

- SvelteKit + TypeScript
- API-driven (no local state persistence)
- UI components kept intentionally simple

It enables field listing, fetched from the backend and allows creating new ones. It also showcases HA for the Arroyo pipelines, displaying their state & allowing manual restart.

## Development

Install dependencies and start the server:

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```
