import type { Routine } from "hevy-ts";
import { toSummary, toExercisesView, toStructureView, roundWeight, findDeletionCandidates } from "../src/lib/routineCatalog";

function makeRoutine(overrides: Partial<Routine> & { id: string }): Routine {
    return {
        title: "Routine",
        folder_id: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        exercises: [],
        ...overrides,
    };
}

const routine: Routine = makeRoutine({
    id: "r1",
    title: "Push Day",
    folder_id: 2,
    exercises: [
        {
            index: 0, title: "Bench", rest_seconds: 90, notes: "", exercise_template_id: "et-bench",
            superset_id: 0,
            sets: [{ index: 0, type: "normal", weight_kg: 50.126, reps: 8, rep_range: null, distance_meters: null, duration_seconds: null, rpe: null, custom_metric: null }],
        },
        {
            index: 1, title: "Fly", rest_seconds: 60, notes: "", exercise_template_id: "et-fly",
            superset_id: 0,
            sets: [{ index: 0, type: "normal", weight_kg: 12, reps: 12, rep_range: null, distance_meters: null, duration_seconds: null, rpe: null, custom_metric: null }],
        },
        {
            index: 2, title: "Tricep Pushdown", rest_seconds: 60, notes: "", exercise_template_id: "et-tricep",
            superset_id: null,
            sets: [
                { index: 0, type: "normal", weight_kg: 20, reps: 10, rep_range: null, distance_meters: null, duration_seconds: null, rpe: null, custom_metric: null },
                { index: 1, type: "normal", weight_kg: 20, reps: 10, rep_range: null, distance_meters: null, duration_seconds: null, rpe: null, custom_metric: null },
            ],
        },
    ],
});

describe("roundWeight", () => {
    it("rounds to 2 decimals without mutating null", () => {
        expect(roundWeight(34.92665402654426)).toBe(34.93);
        expect(roundWeight(null)).toBeNull();
        expect(roundWeight(undefined)).toBeNull();
    });
});

describe("toSummary", () => {
    it("counts exercises, sets, supersets and ungrouped exercises correctly", () => {
        const summary = toSummary(routine);
        expect(summary.exercise_count).toBe(3);
        expect(summary.set_count).toBe(4);
        expect(summary.superset_count).toBe(1);
        expect(summary.ungrouped_count).toBe(1);
        expect(summary.folder_id).toBe(2);
    });
});

describe("toExercisesView", () => {
    it("includes summary fields plus a per-exercise list", () => {
        const view = toExercisesView(routine);
        expect(view.exercise_count).toBe(3);
        expect(view.exercises).toEqual([
            { exercise_template_id: "et-bench", title: "Bench", set_count: 1, superset_id: 0 },
            { exercise_template_id: "et-fly", title: "Fly", set_count: 1, superset_id: 0 },
            { exercise_template_id: "et-tricep", title: "Tricep Pushdown", set_count: 2, superset_id: null },
        ]);
    });
});

describe("toStructureView", () => {
    it("groups exercises by superset, preserving order", () => {
        const view = toStructureView(routine);
        expect(view.groups).toEqual([
            [
                { template_id: "et-bench", title: "Bench" },
                { template_id: "et-fly", title: "Fly" },
            ],
            [{ template_id: "et-tricep", title: "Tricep Pushdown" }],
        ]);
    });
});

describe("findDeletionCandidates", () => {
    it("groups routines with identical exercise/superset structure, ignoring title", () => {
        const duplicate = makeRoutine({ id: "r2", title: "Push Day (copy)", exercises: routine.exercises });
        const unrelated = makeRoutine({
            id: "r3",
            title: "Leg Day",
            exercises: [{
                index: 0, title: "Squat", rest_seconds: 90, notes: "", exercise_template_id: "et-squat",
                superset_id: null,
                sets: [{ index: 0, type: "normal", weight_kg: 100, reps: 5, rep_range: null, distance_meters: null, duration_seconds: null, rpe: null, custom_metric: null }],
            }],
        });

        const candidates = findDeletionCandidates([routine, duplicate, unrelated]);
        expect(candidates).toHaveLength(1);
        expect(candidates[0].routines.map(r => r.id).sort()).toEqual(["r1", "r2"]);
    });

    it("returns nothing when no two routines share a structure", () => {
        const a = makeRoutine({ id: "a", exercises: routine.exercises });
        const b = makeRoutine({ id: "b", exercises: [] });
        expect(findDeletionCandidates([a, b])).toEqual([]);
    });
});
