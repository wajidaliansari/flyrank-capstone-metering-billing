# BUILDLOG.md - AI Usage Summary

## AI Tools Utilized
*   **Gemini:** Acted as a real-time pair programmer and interactive debugging partner, specifically for troubleshooting local environment setups, terminal errors, and database connection logic.
*   **Anthropic Claude:** Explored for broader productivity, leveraging Research mode and Artifacts to help structure concepts and map out AI fluency frameworks earlier in the development cycle.

## Debugging Workflow
*   **Error Diagnosis:** Raw terminal outputs and stack traces were pasted into the AI to quickly identify the root cause of crashes. 
*   **Environment Troubleshooting:** When the local development server crashed with `EADDRINUSE: address already in use :::3000`, the AI provided the exact command (`npx kill-port 3000`) to kill the zombie Node process and free the port.
*   **Syntax & Code Refactoring:** The AI helped rewrite the database connection block in `src/app.js` to ensure the Express server correctly initialized the database before listening for web requests. 

## Key Corrections and Pivots
*   **Bypassing WSL/Docker Corruption:** Initially, the architecture relied on PostgreSQL running in a Docker container. After encountering a persistent `500 Internal Server Error` caused by a corrupted Windows WSL Linux engine, the AI recommended a strategic pivot to SQLite to keep the build moving forward without heavy system repairs.
*   **Node-Gyp C++ Compilation Fix:** During the switch to SQLite, installing the `sqlite3` npm package triggered a massive wall of `node-gyp` C++ build errors because the local machine lacked Visual Studio C++ Build Tools. The AI correctly identified that the local environment was running Node.js v24.13.0 and suggested dropping the external package entirely in favor of Node's newly built-in `node:sqlite` module, which instantly resolved the compilation blocker.