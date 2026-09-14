import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { HevyClient } from "hevy-ts";
import dotenv from "dotenv";

// The MCP transport is JSON-RPC over stdio, so nothing but protocol
// messages may hit stdout. dotenv's "injecting env" banner would corrupt
// that framing.
dotenv.config({ quiet: true });

const apiKey = process.env.HEVY_API_KEY || "";
const hevy = new HevyClient(apiKey);

// Create an MCP server
const server = new McpServer({
    name: "hevy-api-mcp",
    version: "1.0.0"
});

// Hevy API Tools
server.registerTool(
    "getWorkouts",
    {
        title: "Get Workouts",
        description: "List all workouts",
        inputSchema: { page: z.number().optional(), pageSize: z.number().optional() },
    },
    async ({ page = 1, pageSize = 10 }) => {
        const workouts = await hevy.getWorkouts(page, pageSize);
        return { content: [{ type: "text", text: JSON.stringify(workouts, null, 2) }] };
    }
);

server.registerTool(
    "getWorkoutById",
    {
        title: "Get Workout By ID",
        description: "Get a workout by its ID",
        inputSchema: { workoutId: z.string() },
    },
    async ({ workoutId }) => {
        const workout = await hevy.getWorkoutById(workoutId);
        return { content: [{ type: "text", text: JSON.stringify(workout, null, 2) }] };
    }
);

server.registerTool(
    "createWorkout",
    {
        title: "Create Workout",
        description: "Create a new workout",
        inputSchema: {
            title: z.string(),
            description: z.string(),
            start_time: z.string(),
            end_time: z.string(),
            is_private: z.boolean(),
            exercises: z.array(z.object({
                exercise_template_id: z.string(),
                superset_id: z.number().nullable().optional(),
                notes: z.string(),
                sets: z.array(z.object({
                    type: z.string(),
                    weight_kg: z.number().nullable().optional(),
                    reps: z.number().nullable().optional(),
                    distance_meters: z.number().nullable().optional(),
                    duration_seconds: z.number().nullable().optional(),
                    custom_metric: z.any().optional(),
                    rpe: z.number().nullable().optional(),
                })),
            })),
        },
    },
    async (input) => {
        // Corrige superset_id: undefined -> null
        const fixedInput = {
            ...input,
            exercises: input.exercises.map(ex => ({
                ...ex,
                superset_id: ex.superset_id === undefined ? null : ex.superset_id,
                sets: ex.sets.map(set => ({
                    ...set,
                    weight_kg: set.weight_kg === undefined ? null : set.weight_kg,
                    reps: set.reps === undefined ? null : set.reps,
                    distance_meters: set.distance_meters === undefined ? null : set.distance_meters,
                    duration_seconds: set.duration_seconds === undefined ? null : set.duration_seconds,
                    rpe: set.rpe === undefined ? null : set.rpe,
                    custom_metric: set.hasOwnProperty('custom_metric') ? set.custom_metric : null,
                }))
            }))
        };
        const workout = await hevy.createWorkout(fixedInput);
        return { content: [{ type: "text", text: JSON.stringify(workout, null, 2) }] };
    }
);

server.registerTool(
    "updateWorkout",
    {
        title: "Update Workout",
        description: "Update an existing workout",
        inputSchema: {
            workoutId: z.string(),
            workout: z.object({
                title: z.string(),
                description: z.string(),
                start_time: z.string(),
                end_time: z.string(),
                is_private: z.boolean(),
                exercises: z.array(z.object({
                    exercise_template_id: z.string(),
                    superset_id: z.number().nullable().optional(),
                    notes: z.string(),
                    sets: z.array(z.object({
                        type: z.string(),
                        weight_kg: z.number().nullable().optional(),
                        reps: z.number().nullable().optional(),
                        distance_meters: z.number().nullable().optional(),
                        duration_seconds: z.number().nullable().optional(),
                        custom_metric: z.any().optional(),
                        rpe: z.number().nullable().optional(),
                    })),
                })),
            }),
        },
    },
    async ({ workoutId, workout }) => {
        // Corrige superset_id: undefined -> null
        const fixedWorkout = {
            ...workout,
            exercises: workout.exercises.map(ex => ({
                ...ex,
                superset_id: ex.superset_id === undefined ? null : ex.superset_id,
                sets: ex.sets.map(set => ({
                    ...set,
                    weight_kg: set.weight_kg === undefined ? null : set.weight_kg,
                    reps: set.reps === undefined ? null : set.reps,
                    distance_meters: set.distance_meters === undefined ? null : set.distance_meters,
                    duration_seconds: set.duration_seconds === undefined ? null : set.duration_seconds,
                    rpe: set.rpe === undefined ? null : set.rpe,
                    custom_metric: set.hasOwnProperty('custom_metric') ? set.custom_metric : null,
                }))
            }))
        };
        const updated = await hevy.updateWorkout(workoutId, fixedWorkout);
        return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
    }
);

server.registerTool(
    "getRoutineFolders",
    {
        title: "Get Routine Folders",
        description: "List all routine folders",
        inputSchema: { page: z.number().optional(), pageSize: z.number().optional() },
    },
    async ({ page = 1, pageSize = 10 }) => {
        const folders = await hevy.getRoutineFolders(page, pageSize);
        return { content: [{ type: "text", text: JSON.stringify(folders, null, 2) }] };
    }
);

server.registerTool(
    "getRoutineFolderById",
    {
        title: "Get Routine Folder By ID",
        description: "Get a routine folder by its ID",
        inputSchema: { folderId: z.number() },
    },
    async ({ folderId }) => {
        const folder = await hevy.getRoutineFolderById(folderId);
        return { content: [{ type: "text", text: JSON.stringify(folder, null, 2) }] };
    }
);

server.registerTool(
    "createRoutineFolder",
    {
        title: "Create Routine Folder",
        description: "Create a new routine folder",
        inputSchema: { title: z.string() },
    },
    async ({ title }) => {
        const folder = await hevy.createRoutineFolder({ title });
        return { content: [{ type: "text", text: JSON.stringify(folder, null, 2) }] };
    }
);

server.registerTool(
    "getRoutines",
    {
        title: "Get Routines",
        description: "List all routines (reusable workout templates)",
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
        description: "Get a routine (reusable workout template) by its ID",
        inputSchema: { routineId: z.string() },
    },
    async ({ routineId }) => {
        const routine = await hevy.getRoutineById(routineId);
        return { content: [{ type: "text", text: JSON.stringify(routine, null, 2) }] };
    }
);

const routineExerciseSchema = z.object({
    exercise_template_id: z.string(),
    // Exercises sharing the same superset_id are grouped into one superset,
    // performed back to back; null means the exercise stands on its own.
    superset_id: z.number().nullable().optional(),
    rest_seconds: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
    sets: z.array(z.object({
        type: z.string(),
        weight_kg: z.number().nullable().optional(),
        reps: z.number().nullable().optional(),
        rep_range: z.object({
            start: z.number().nullable().optional(),
            end: z.number().nullable().optional(),
        }).nullable().optional(),
        distance_meters: z.number().nullable().optional(),
        duration_seconds: z.number().nullable().optional(),
        rpe: z.number().nullable().optional(),
        custom_metric: z.number().nullable().optional(),
    })),
});

function normalizeRoutineExercises(exercises: z.infer<typeof routineExerciseSchema>[]) {
    return exercises.map(ex => ({
        ...ex,
        superset_id: ex.superset_id ?? null,
        rest_seconds: ex.rest_seconds ?? null,
        notes: ex.notes ?? null,
        sets: ex.sets.map(set => ({
            ...set,
            weight_kg: set.weight_kg ?? null,
            reps: set.reps ?? null,
            rep_range: set.rep_range
                ? { start: set.rep_range.start ?? null, end: set.rep_range.end ?? null }
                : null,
            distance_meters: set.distance_meters ?? null,
            duration_seconds: set.duration_seconds ?? null,
            rpe: set.rpe ?? null,
            custom_metric: set.custom_metric ?? null,
        })),
    }));
}

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
        description: "Update an existing routine, e.g. to reorder exercises or group them into supersets",
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

server.registerTool(
    "getExerciseTemplates",
    {
        title: "Get Exercise Templates",
        description: "List all exercise templates",
        inputSchema: { page: z.number().optional(), pageSize: z.number().optional() },
    },
    async ({ page = 1, pageSize = 10 }) => {
        const templates = await hevy.getExerciseTemplates(page, pageSize);
        return { content: [{ type: "text", text: JSON.stringify(templates, null, 2) }] };
    }
);

server.registerTool(
    "getExerciseTemplateById",
    {
        title: "Get Exercise Template By ID",
        description: "Get an exercise template by its ID",
        inputSchema: { exerciseTemplateId: z.string() },
    },
    async ({ exerciseTemplateId }) => {
        const template = await hevy.getExerciseTemplateById(exerciseTemplateId);
        return { content: [{ type: "text", text: JSON.stringify(template, null, 2) }] };
    }
);

server.registerTool(
    "getWebhookSubscription",
    {
        title: "Get Webhook Subscription",
        description: "Get the current webhook subscription",
        inputSchema: {},
    },
    async () => {
        const webhook = await hevy.getWebhookSubscription();
        return { content: [{ type: "text", text: JSON.stringify(webhook, null, 2) }] };
    }
);

server.registerTool(
    "createWebhookSubscription",
    {
        title: "Create Webhook Subscription",
        description: "Create a new webhook subscription",
        inputSchema: { authToken: z.string(), url: z.string() },
    },
    async ({ authToken, url }) => {
        const result = await hevy.createWebhookSubscription({ authToken, url });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
);

server.registerTool(
    "deleteWebhookSubscription",
    {
        title: "Delete Webhook Subscription",
        description: "Delete the current webhook subscription",
        inputSchema: {},
    },
    async () => {
        await hevy.deleteWebhookSubscription();
        return { content: [{ type: "text", text: "Webhook subscription deleted" }] };
    }
);

// Add a dynamic greeting resource
server.registerResource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    {
        title: "Greeting Resource",      // Display name for UI
        description: "Dynamic greeting generator"
    },
    async (uri, { name }) => ({
        contents: [{
            uri: uri.href,
            text: `Hello, ${name}!`
        }]
    })
);

// Start receiving messages on stdin and sending messages on stdout
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main();