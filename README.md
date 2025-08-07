# hevy-mcp

MCP server for the Hevy API

## Installation

1. Clone the repository and navigate to the directory:
   ```sh
   git clone https://github.com/jcjiron/hevy-mcp.git
   cd hevy-mcp
   ```
2. Install dependencies and build:
   ```sh
   npm install
   npm run build
   ```

## Usage with npx

You can run the MCP server using npx (locally or globally, if published to npm):

```sh
npx hevy-mcp
```

Or from your MCP config:

```json
{
  "mcpServers": {
    "hevy-mcp": {
      "command": "npx",
      "args": ["-y", "hevy-mcp"],
      "env": {
        "HEVY_API_KEY": "<YOUR_API_KEY>"
      }
    }
  }
}
```

## Environment variables

- `HEVY_API_KEY`: Your Hevy API key (required).

You can use a `.env` file for local development:

```
HEVY_API_KEY=your_api_key
```

## Exposed tools

- getWorkouts
- getWorkoutById
- createWorkout
- updateWorkout
- getRoutineFolders
- getRoutineFolderById
- createRoutineFolder
- getExerciseTemplates
- getExerciseTemplateById
- getWebhookSubscription
- createWebhookSubscription
- deleteWebhookSubscription

## Usage example

You can test the server locally:

```sh
HEVY_API_KEY=your_api_key npx hevy-mcp
```

Or using the `.env` file:

```sh
npx hevy-mcp
```

---

For questions or suggestions, open an issue in the repository.
