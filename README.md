# hevy-api-mcp

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
npx hevy-api-mcp
```

Or from your MCP config:

```json
{
  "mcpServers": {
    "hevy-api-mcp": {
      "command": "npx",
      "args": ["-y", "hevy-api-mcp"],
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

Raw 1:1 API wrappers:

- getWorkouts, getWorkoutById, createWorkout, updateWorkout
- getRoutineFolders, getRoutineFolderById, createRoutineFolder
- getRoutines, getRoutineById, createRoutine, updateRoutine
- getExerciseTemplates, getExerciseTemplateById
- getWebhookSubscription, createWebhookSubscription, deleteWebhookSubscription

Catalog-scale tools, for operating on many routines at once without blowing
past an agent's context window or risking silent data loss on a routine's
sets/weights/reps (see [Catalog operations](#catalog-operations-v2) below):

- `listRoutines` — the whole routine catalog in one call, with a
  size-controlled projection (`summary` / `exercises` / `structure` / `sets`)
- `getExerciseTemplatesByIds` — batch-resolve exercise template IDs instead
  of one `getExerciseTemplateById` call per ID
- `patchRoutine` — change a routine's title/notes or specific exercise
  fields without resending the whole routine
- `setRoutineSupersets` — regroup a routine's exercises into supersets in
  one call
- `exportRoutines` / `importRoutines` — back up routines to a local file and
  restore them; **run `exportRoutines` before any bulk change**
- `moveRoutineToFolder` — always returns `{ unsupported: true }` (see below)
- `listDeletionCandidates` — finds routines with identical structure
  (likely duplicates) for manual review; there is no `deleteRoutine`

### What the Hevy API doesn't support

Confirmed against the API's OpenAPI spec, not guessed:

- **No `DELETE` for routines or routine folders.** There is no way to
  delete a routine or a folder through the API. `listDeletionCandidates`
  identifies likely duplicates for you to remove by hand in the app.
- **`PUT /v1/routines/{id}` does not accept `folder_id`.** A routine can't
  be moved between folders without recreating it under a new ID (which
  loses its history), so `moveRoutineToFolder` refuses to do that
  automatically and just reports `unsupported`.
- **A routine's own `notes` field is write-only.** `GET` responses for a
  routine never include it, only `POST`/`PUT` accept it. `patchRoutine` and
  `importRoutines` can't round-trip it — if you don't pass `notes`
  explicitly, it's left out of the request rather than guessed at.
- **`pageSize` for `/v1/routines` maxes out at 10** server-side.
  `listRoutines`/`exportRoutines`/`listDeletionCandidates` page through
  this internally so callers never have to.

### Catalog operations (v2)

`getRoutines`/`updateRoutine` mirror the Hevy API 1:1: reading the full
catalog means paging through it yourself, and writing means resending a
routine's entire exercise/set payload even to change one field. That's
fine for one routine, but breaks down at real scale (tested against a
77-routine, ~1,400-set catalog): downloading everything to answer "what
routines do I have" cost ~760KB of JSON where the answer needed about 7%
of that, and a naive rename-by-resend risks dropping a weight, a
`rep_range`, or an `rpe` value nobody meant to touch.

The tools above exist to make that safe:

- `listRoutines` never returns more than the projection you asked for.
- `patchRoutine` and `setRoutineSupersets` read the current routine
  server-side and merge your change in, so every field you didn't mention
  survives the round trip unchanged (weights included, down to full
  floating-point precision — the source is never rounded, only the JSON
  `listRoutines` returns for display is). Both are all-or-nothing: if an
  exercise match is ambiguous, or one of the routine's exercises isn't
  covered by any group, nothing is written and you get an error naming the
  problem.
- Both support `dryRun: true` to preview the exact write body first.
- `exportRoutines` is the safety net for all of the above — run it before
  any bulk change so a bad edit can be reverted with `importRoutines`.

## Usage example

You can test the server locally:

```sh
HEVY_API_KEY=your_api_key npx hevy-api-mcp
```

Or using the `.env` file:

```sh
npx hevy-api-mcp
```

---

For questions or suggestions, open an issue in the repository.
