# `/vessy:agents`

Lists all agents configured in the current project's `.vessy/agents/` directory.

## Instructions

1. Determine the vessy plugin directory (the parent of the `skills/` directory containing this file).
2. Use the Bash tool to run:
   ```bash
   node <vessy-plugin-dir>/dist/cli.cjs agents
   ```
   where `<vessy-plugin-dir>` is the absolute path to the installed vessy plugin.
3. Present the output as a formatted table. Each row is: agent name, type (`llm` / `script` / `composite`), and model (for LLM agents).

## Example output

```
researcher    llm     claude-opus-4-7
analyst       llm     claude-haiku-4-5
runner        script
```
