import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HevyClient } from "hevy-ts";
import { routineExerciseSchema, normalizeRoutineExercises } from "../lib/routineSchema";

export function registerRoutineTools(server: McpServer, hevy: HevyClient) {
    server.registerTool(
        "getRoutines",
        {
            title: "Get Routines",
            description: "List all routines (reusable workout templates). Returns the full raw payload for every routine (sets, weights, notes, ...) - for large catalogs prefer listRoutines with a smaller 'fields' projection.",
            inputSchema: { page: z.number().optional(), pageSize: z.number().optional() },
        },
        async ({ page = 1, pageSize = 10 }) => {
            const routines = await hevy.getRoutines(page, pageSize);
            return { content: [{ type: "text", text: JSON.stringify(routines, null, 2) }] };
        }
    );

    server.registerTool(
        "getRoutineById",
        {
            title: "Get Routine By ID",
            description: "Get a routine (reusable workout template) by its ID, full raw payload",
            inputSchema: { routineId: z.string() },
        },
        async ({ routineId }) => {
            const routine = await hevy.getRoutineById(routineId);
            return { content: [{ type: "text", text: JSON.stringify(routine, null, 2) }] };
        }
    );

    server.registerTool(
        "createRoutine",
        {
            title: "Create Routine",
            description: "Create a new routine (reusable workout template)",
            inputSchema: {
                title: z.string(),
                folder_id: z.number().nullable().optional(),
                notes: z.string().optional(),
                exercises: z.array(routineExerciseSchema),
            },
        },
        async ({ title, folder_id, notes, exercises }) => {
            const routine = await hevy.createRoutine({
                title,
                folder_id: folder_id ?? null,
                notes,
                exercises: normalizeRoutineExercises(exercises),
            });
            return { content: [{ type: "text", text: JSON.stringify(routine, null, 2) }] };
        }
    );

    server.registerTool(
        "updateRoutine",
        {
            title: "Update Routine",
            description: "Replace an entire routine's title/notes/exercises. This is a full overwrite - every exercise, set, weight, rep, note etc. must be included or it's lost. For a small change (rename, regroup into supersets) on a routine you don't have the full current payload for, prefer patchRoutine or setRoutineSupersets instead.",
            inputSchema: {
                routineId: z.string(),
                title: z.string(),
                notes: z.string().nullable().optional(),
                exercises: z.array(routineExerciseSchema),
            },
        },
        async ({ routineId, title, notes, exercises }) => {
            const routine = await hevy.updateRoutine(routineId, {
                title,
                notes: notes ?? null,
                exercises: normalizeRoutineExercises(exercises),
            });
            return { content: [{ type: "text", text: JSON.stringify(routine, null, 2) }] };
        }
    );
}
