import type { Routine, UpdateRoutineRequest, RoutineExerciseRequest } from "hevy-ts";
import { routineExerciseToRequest } from "./routineSchema";

export interface GroupMember {
    index?: number;
    exercise_template_id?: string;
}

export interface RoutineGroup {
    members: GroupMember[];
}

export interface SetSupersetsInput {
    groups: RoutineGroup[];
    restSecondsBetweenGroups?: number;
    restSecondsWithinGroup?: number;
}

export type SetSupersetsResult =
    | { ok: true; body: UpdateRoutineRequest }
    | { ok: false; error: string };

function resolveMember(current: Routine, member: GroupMember): number[] {
    return current.exercises
        .map((ex, i) => ({ ex, i }))
        .filter(({ ex }) =>
            member.index !== undefined ? ex.index === member.index : ex.exercise_template_id === member.exercise_template_id
        )
        .map(({ i }) => i);
}

/**
 * Reassigns every exercise in a routine to the groups given, in the given
 * order, renumbering superset_id from 0 across the groups that have more
 * than one member (a single-member group is just a standalone exercise,
 * superset_id null). Every field other than order/superset_id/rest_seconds
 * is round-tripped unchanged via routineExerciseToRequest - same
 * no-silent-data-loss guarantee as patchRoutine.
 *
 * All-or-nothing: aborts without building a body if a member doesn't
 * resolve to exactly one exercise, if the same exercise is placed in more
 * than one group, or if any of the routine's exercises is left out of
 * every group.
 */
export function buildSupersetRegroupedRequest(current: Routine, input: SetSupersetsInput): SetSupersetsResult {
    const restWithin = input.restSecondsWithinGroup ?? 0;
    const usedIndexes = new Set<number>();
    const finalExercises: RoutineExerciseRequest[] = [];
    let supersetCounter = 0;

    for (let groupIdx = 0; groupIdx < input.groups.length; groupIdx++) {
        const group = input.groups[groupIdx];
        if (!group.members || group.members.length === 0) {
            return { ok: false, error: `Group ${groupIdx} has no members. No changes were written.` };
        }

        const resolvedIndexes: number[] = [];
        for (const member of group.members) {
            const indexes = resolveMember(current, member);
            if (indexes.length !== 1) {
                return {
                    ok: false,
                    error: `Group ${groupIdx} member ${JSON.stringify(member)} resolved to ${indexes.length} exercise(s) in routine "${current.title}"; expected exactly 1. No changes were written.`,
                };
            }
            resolvedIndexes.push(indexes[0]);
        }

        for (const idx of resolvedIndexes) {
            if (usedIndexes.has(idx)) {
                const ex = current.exercises[idx];
                return {
                    ok: false,
                    error: `Exercise "${ex.exercise_template_id}" (index ${ex.index}) was placed in more than one group. No changes were written.`,
                };
            }
            usedIndexes.add(idx);
        }

        const supersetId = resolvedIndexes.length > 1 ? supersetCounter++ : null;
        resolvedIndexes.forEach((idx, posInGroup) => {
            const ex = current.exercises[idx];
            const req = routineExerciseToRequest(ex);
            req.superset_id = supersetId;
            const isLastInGroup = posInGroup === resolvedIndexes.length - 1;
            req.rest_seconds = isLastInGroup
                ? (input.restSecondsBetweenGroups !== undefined ? input.restSecondsBetweenGroups : ex.rest_seconds)
                : restWithin;
            finalExercises.push(req);
        });
    }

    if (usedIndexes.size !== current.exercises.length) {
        const missing = current.exercises
            .map((ex, i) => ({ ex, i }))
            .filter(({ i }) => !usedIndexes.has(i))
            .map(({ ex }) => `${ex.exercise_template_id} (index ${ex.index})`);
        return {
            ok: false,
            error: `Not every exercise in routine "${current.title}" was placed in a group. Missing: ${missing.join(", ")}. No changes were written.`,
        };
    }

    return {
        ok: true,
        body: { title: current.title, exercises: finalExercises },
    };
}
