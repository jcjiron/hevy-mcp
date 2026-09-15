import type { Routine, UpdateRoutineRequest, RoutineExerciseRequest } from "hevy-ts";
import { routineExerciseToRequest } from "./routineSchema";

export interface ExercisePatchMatch {
    index?: number;
    exercise_template_id?: string;
}

export interface ExercisePatch {
    match: ExercisePatchMatch;
    superset_id?: number | null;
    rest_seconds?: number;
    notes?: string;
}

export interface PatchRoutineInput {
    title?: string;
    notes?: string;
    exercises?: ExercisePatch[];
}

export type PatchRoutineResult =
    | { ok: true; body: UpdateRoutineRequest }
    | { ok: false; error: string };

function findExerciseIndex(current: Routine, match: ExercisePatchMatch): { indexes: number[] } {
    const indexes = current.exercises
        .map((ex, i) => ({ ex, i }))
        .filter(({ ex }) =>
            match.index !== undefined ? ex.index === match.index : ex.exercise_template_id === match.exercise_template_id
        )
        .map(({ i }) => i);
    return { indexes };
}

/**
 * Builds the full UpdateRoutineRequest body for a partial change, without
 * ever touching a field the caller didn't ask to change: every exercise
 * not targeted by a patch, and every field of a targeted exercise other
 * than the ones explicitly patched, is round-tripped unchanged from what
 * was read. This is what makes patchRoutine safe to use for something as
 * small as a rename without risking silently dropping weights, reps,
 * rep_range, rpe, per-set notes or custom_metric.
 *
 * Routine-level `notes` is the one field this can't guarantee: Hevy's
 * Routine read response doesn't include it (write-only field), so there
 * is nothing to round-trip from. If the caller doesn't pass `notes`, it's
 * omitted from the request body entirely rather than guessed at.
 */
export function buildPatchedRoutineRequest(current: Routine, patch: PatchRoutineInput): PatchRoutineResult {
    const requestExercises: RoutineExerciseRequest[] = current.exercises.map(routineExerciseToRequest);

    if (patch.exercises) {
        for (const exPatch of patch.exercises) {
            const { indexes } = findExerciseIndex(current, exPatch.match);
            if (indexes.length !== 1) {
                return {
                    ok: false,
                    error: `Match ${JSON.stringify(exPatch.match)} resolved to ${indexes.length} exercise(s) in routine "${current.title}"; expected exactly 1. No changes were written.`,
                };
            }
            const i = indexes[0];
            if (exPatch.superset_id !== undefined) requestExercises[i].superset_id = exPatch.superset_id;
            if (exPatch.rest_seconds !== undefined) requestExercises[i].rest_seconds = exPatch.rest_seconds;
            if (exPatch.notes !== undefined) requestExercises[i].notes = exPatch.notes;
        }
    }

    const body: UpdateRoutineRequest = {
        title: patch.title ?? current.title,
        exercises: requestExercises,
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    };

    return { ok: true, body };
}
