# `/vessy:run-pipeline <name>`

Runs a vessy pipeline by name and streams its output.

## Instructions

1. Extract the pipeline name from the slash command arguments.
2. Determine the vessy plugin directory (the parent of the `skills/` directory containing this file).
3. Use the Bash tool to run:
   ```bash
   node <vessy-plugin-dir>/dist/cli.cjs run <name>
   ```
4. Present the output as-is. Highlight:
   - The final pipeline status (Passed / Failed).
   - The session directory path where artifacts are stored.

## Output format

Each agent emits start (`▶`) and completion (`✓` / `✗`) lines. The separator and summary appear when the pipeline finishes.

```
▶  fetch          session-a3f7bc92 / 1-fetch
✓  fetch          Passed     4.2s
▶  researcher     session-a3f7bc92 / 2-researcher
✓  researcher     Passed     8.1s  1540 tok  $0.012
─────────────────────────────────────────────────────
Pipeline        Passed   12.3s  $0.012
Session         .vessy/sessions/session-a3f7bc92
```

## Exit codes

- Exit `0` — pipeline ran (even if status is Failed — that is a business outcome).
- Exit `1` — technical error (pipeline file not found, agent file missing, etc.).
