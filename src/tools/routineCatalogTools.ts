import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HevyClient } from "hevy-ts";
import { fetchAllRoutines, listRoutinesProjected, findDeletionCandidates } from "../lib/routineCatalog";
import { buildPatchedRoutineRequest } from "../lib/routinePatch";
import { buildSupersetRegroupedRequest } from "../lib/routineSupersets";

const exerciseMatchSchema = z.object({
    index: z.number().optional(),
    exercise_template_id: z.string().optional(),
}).refine(m => m.index !== undefined || m.exercise_template_id !== undefined, {
    message: "match must include either index or exercise_template_id",
});

export function registerRoutineCatalogTools(server: McpServer, hevy: HevyClient) {
    server.registerTool(
        "listRoutines",
        {
            title: "List Routines (projected)",
            description:
                "List the whole routine catalog in one call, with a size-controlled projection. Handles Hevy's 10-per-page pagination internally. Typical response size per routine: 'summary' ~150 bytes, 'exercises' ~300 bytes, 'structure' ~500 bytes-1KB, 'sets' (full raw payload, weight_kg rounded to 2 decimals for display only) 5-15KB. Default is ['summary']. Prefer the smallest projection that answers the question.",
            inputSchema: {
                fields: z.array(z.enum(["summary", "exercises", "structure", "sets"])).optional(),
                folderId: z.number().nullable().optional(),
                titleContains: z.string().optional(),
            },
        },
        async ({ fields, folderId, titleContains }) => {
            const result = await listRoutinesProjected(hevy, { fields: fields as any, folderId, titleContains });
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
    );

    server.registerTool(
        "patchRoutine",
        {
            title: "Patch Routine",
            description:
                "Change a routine's title/notes, or specific fields (superset_id, rest_seconds, notes) of specific exercises, WITHOUT resending the whole routine. Reads the current routine server-side and merges the patch in, so every weight, rep, rep_range, rpe and custom_metric you didn't mention survives untouched. Each exercise patch must 'match' exactly one exercise (by index or exercise_template_id) or the whole call is aborted with no writes. Use dryRun:true to preview the exact body that would be sent. Routine-level 'notes' can't be read back from Hevy's API (write-only field) - if you don't pass notes, it's left out of the request rather than guessed at.",
            inputSchema: {
                routineId: z.string(),
                title: z.string().optional(),
                notes: z.string().optional(),
                exercises: z.array(z.object({
                    match: exerciseMatchSchema,
                    superset_id: z.number().nullable().optional(),
                    rest_seconds: z.number().optional(),
                    notes: z.string().optional(),
                })).optional(),
                dryRun: z.boolean().optional(),
            },
        },
        async ({ routineId, title, notes, exercises, dryRun }) => {
            const current = await hevy.getRoutineById(routineId);
            const result = buildPatchedRoutineRequest(current, { title, notes, exercises });
            if (!result.ok) {
                return { content: [{ type: "text", text: JSON.stringify({ error: result.error }, null, 2) }], isError: true };
            }
            if (dryRun) {
                return { content: [{ type: "text", text: JSON.stringify({ dryRun: true, wouldWrite: result.body }, null, 2) }] };
            }
            const updated = await hevy.updateRoutine(routineId, result.body);
            return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
        }
    );

    server.registerTool(
        "setRoutineSupersets",
        {
            title: "Set Routine Supersets",
            description:
                "Regroup a routine's exercises into supersets (or ungroup them) in one call, without resending set data. 'groups' is the full, final ordering - every exercise currently in the routine must appear in exactly one group, or the call aborts with no writes (this is deliberately strict: it's meant to catch a group list that's missing an exercise before that exercise silently falls out of the routine). A group with one member is a standalone exercise (superset_id null); a group with several is a superset performed back to back - superset_id is renumbered from 0 in group order. restSecondsWithinGroup (default 0) applies to every member except the last in its group; restSecondsBetweenGroups applies to the last member of each group (omit to keep that exercise's existing rest_seconds). Use dryRun:true to preview the resulting grouping.",
            inputSchema: {
                routineId: z.string(),
                groups: z.array(z.object({
                    members: z.array(exerciseMatchSchema),
                })),
                restSecondsBetweenGroups: z.number().optional(),
                restSecondsWithinGroup: z.number().optional(),
                dryRun: z.boolean().optional(),
            },
        },
        async ({ routineId, groups, restSecondsBetweenGroups, restSecondsWithinGroup, dryRun }) => {
            const current = await hevy.getRoutineById(routineId);
            const result = buildSupersetRegroupedRequest(current, { groups, restSecondsBetweenGroups, restSecondsWithinGroup });
            if (!result.ok) {
                return { content: [{ type: "text", text: JSON.stringify({ error: result.error }, null, 2) }], isError: true };
            }
            if (dryRun) {
                return { content: [{ type: "text", text: JSON.stringify({ dryRun: true, wouldWrite: result.body }, null, 2) }] };
            }
            const updated = await hevy.updateRoutine(routineId, result.body);
            return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
        }
    );

    server.registerTool(
        "moveRoutineToFolder",
        {
            title: "Move Routine To Folder",
            description:
                "Always returns { unsupported: true }. Hevy's public API (PUT /v1/routines/{id}) does not accept folder_id, so an existing routine cannot be moved between folders while preserving its id and history. Moving a routine has to be done by hand in the Hevy app.",
            inputSchema: { routineId: z.string(), folderId: z.number().nullable() },
        },
        async () => {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        unsupported: true,
                        reason: "PUT /v1/routines/{id} does not accept folder_id. There is no safe way to move a routine between folders via the API without recreating it under a new id (which loses its history), so this is not done automatically.",
                    }, null, 2),
                }],
            };
        }
    );

    server.registerTool(
        "listDeletionCandidates",
        {
            title: "List Deletion Candidates",
            description:
                "Finds groups of routines that share the exact same exercise/superset structure (likely duplicates), for you to review and delete by hand in the Hevy app. Hevy's API has no DELETE endpoint for routines, so deletion can't be automated - this only identifies candidates.",
            inputSchema: {},
        },
        async () => {
            const routines = await fetchAllRoutines(hevy);
            const candidates = findDeletionCandidates(routines);
            return { content: [{ type: "text", text: JSON.stringify({ groups: candidates }, null, 2) }] };
        }
    );
}
