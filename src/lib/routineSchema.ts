import { z } from "zod";
import type { Routine, RoutineExercise, RoutineExerciseRequest, RoutineSetRequest } from "hevy-ts";

// Deliberately does NOT include rep_range/rpe: those are workout-set
// fields. POST/PUT /v1/routines reject unrecognized keys outright (400
// "Unrecognized key(s) in object: 'rpe'"), confirmed against the live
// API. Every routine-set builder in this file goes through
// toRoutineSetRequest below, which allowlists exactly these fields, so a
// caller-supplied or round-tripped rep_range/rpe can never leak into a
// request body again.
export const routineExerciseSchema = z.object({
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
        distance_meters: z.number().nullable().optional(),
        duration_seconds: z.number().nullable().optional(),
        custom_metric: z.number().nullable().optional(),
    })),
});

interface SetLike {
    type: string;
    weight_kg?: number | null;
    reps?: number | null;
    distance_meters?: number | null;
    duration_seconds?: number | null;
    custom_metric?: number | null;
}

// The one place a routine set's request body is built, by every caller
// (createRoutine/updateRoutine's direct input, and patchRoutine/
// setRoutineSupersets/importRoutines' round-tripped read). An explicit
// allowlist rather than a spread, so a field that doesn't belong on a
// routine set - present on the input object or not - can never end up in
// the outgoing JSON.
function toRoutineSetRequest(set: SetLike): RoutineSetRequest {
    return {
        type: set.type,
        weight_kg: set.weight_kg ?? null,
        reps: set.reps ?? null,
        distance_meters: set.distance_meters ?? null,
        duration_seconds: set.duration_seconds ?? null,
        custom_metric: set.custom_metric ?? null,
    };
}

export function normalizeRoutineExercises(exercises: z.infer<typeof routineExerciseSchema>[]): RoutineExerciseRequest[] {
    return exercises.map(ex => ({
        exercise_template_id: ex.exercise_template_id,
        superset_id: ex.superset_id ?? null,
        rest_seconds: ex.rest_seconds ?? null,
        notes: ex.notes ?? null,
        sets: ex.sets.map(toRoutineSetRequest),
    }));
}

/**
 * Maps a routine exercise exactly as read from getRoutineById/getRoutines
 * back into the shape updateRoutine/createRoutine expect, without touching
 * any field the Routines API actually supports. This is the round-trip
 * used by patchRoutine and setRoutineSupersets so that fields callers
 * never asked to change (set weights, reps, per-set notes, custom_metric)
 * survive a write byte-for-byte.
 */
export function routineExerciseToRequest(ex: RoutineExercise): RoutineExerciseRequest {
    return {
        exercise_template_id: ex.exercise_template_id,
        superset_id: ex.superset_id,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
        sets: ex.sets.map(toRoutineSetRequest),
    };
}

export function routineToUpdateRequest(routine: Routine) {
    return {
        title: routine.title,
        exercises: routine.exercises.map(routineExerciseToRequest),
    };
}
