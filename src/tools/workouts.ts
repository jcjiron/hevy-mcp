import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HevyClient } from "hevy-ts";

const workoutExerciseSchema = z.object({
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
});

function normalizeWorkoutExercises(exercises: z.infer<typeof workoutExerciseSchema>[]) {
    return exercises.map(ex => ({
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
    }));
}

export function registerWorkoutTools(server: McpServer, hevy: HevyClient) {
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
                exercises: z.array(workoutExerciseSchema),
            },
        },
        async (input) => {
            const fixedInput = { ...input, exercises: normalizeWorkoutExercises(input.exercises) };
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
                    exercises: z.array(workoutExerciseSchema),
                }),
            },
        },
        async ({ workoutId, workout }) => {
            const fixedWorkout = { ...workout, exercises: normalizeWorkoutExercises(workout.exercises) };
            const updated = await hevy.updateWorkout(workoutId, fixedWorkout);
            return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
        }
    );
}
