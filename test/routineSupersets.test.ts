import type { Routine } from "hevy-ts";
import { buildSupersetRegroupedRequest } from "../src/lib/routineSupersets";

// Exactly the case from the original bug report: three separate exercises
// (leg, hamstring, glute) that should become one superset, plus one
// unrelated exercise that stays standalone.
const fixtureRoutine: Routine = {
    id: "r1",
    title: "Leg Day",
    folder_id: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-06-01T00:00:00Z",
    exercises: [
        {
            index: 0,
            title: "Leg Extension",
            rest_seconds: 90,
            notes: "",
            exercise_template_id: "et-leg",
            supersets_id: null,
            sets: [{ index: 0, type: "normal", weight_kg: 40, reps: 12, rep_range: null, distance_meters: null, duration_seconds: null, rpe: null, custom_metric: null }],
        },
        {
            index: 1,
            title: "Leg Curl",
            rest_seconds: 90,
            notes: "",
            exercise_template_id: "et-hamstring",
            supersets_id: null,
            sets: [{ index: 0, type: "normal", weight_kg: 30, reps: 12, rep_range: null, distance_meters: null, duration_seconds: null, rpe: null, custom_metric: null }],
        },
        {
            index: 2,
            title: "Hip Thrust",
            rest_seconds: 90,
            notes: "",
            exercise_template_id: "et-glute",
            supersets_id: null,
            sets: [{ index: 0, type: "normal", weight_kg: 60.5, reps: 10, rep_range: null, distance_meters: null, duration_seconds: null, rpe: 8, custom_metric: null }],
        },
        {
            index: 3,
            title: "Calf Raise",
            rest_seconds: 60,
            notes: "unrelated",
            exercise_template_id: "et-calf",
            supersets_id: null,
            sets: [{ index: 0, type: "normal", weight_kg: 80, reps: 15, rep_range: null, distance_meters: null, duration_seconds: null, rpe: null, custom_metric: null }],
        },
    ],
};

describe("buildSupersetRegroupedRequest", () => {
    it("groups leg/hamstring/glute into one superset with rest only on the last, leaves calf raise standalone", () => {
        const result = buildSupersetRegroupedRequest(fixtureRoutine, {
            groups: [
                {
                    members: [
                        { exercise_template_id: "et-leg" },
                        { exercise_template_id: "et-hamstring" },
                        { exercise_template_id: "et-glute" },
                    ],
                },
                { members: [{ exercise_template_id: "et-calf" }] },
            ],
            restSecondsBetweenGroups: 120,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const [leg, hamstring, glute, calf] = result.body.exercises;

        expect(leg.superset_id).toBe(0);
        expect(hamstring.superset_id).toBe(0);
        expect(glute.superset_id).toBe(0);
        expect(leg.rest_seconds).toBe(0);
        expect(hamstring.rest_seconds).toBe(0);
        expect(glute.rest_seconds).toBe(120); // last in group gets the between-groups rest

        expect(calf.superset_id).toBeNull();
        expect(calf.rest_seconds).toBe(120); // also last (only) in its own group

        // set data untouched, including the float weight
        expect(glute.sets[0].weight_kg).toBe(60.5);
        expect(glute.sets[0].rpe).toBe(8);
    });

    it("preserves each exercise's own rest_seconds when restSecondsBetweenGroups is omitted", () => {
        const result = buildSupersetRegroupedRequest(fixtureRoutine, {
            groups: [
                { members: [{ exercise_template_id: "et-leg" }, { exercise_template_id: "et-hamstring" }] },
                { members: [{ exercise_template_id: "et-glute" }] },
                { members: [{ exercise_template_id: "et-calf" }] },
            ],
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const [, hamstring, glute, calf] = result.body.exercises;
        expect(hamstring.rest_seconds).toBe(90); // original rest_seconds of et-hamstring
        expect(glute.rest_seconds).toBe(90); // original rest_seconds of et-glute
        expect(calf.rest_seconds).toBe(60); // original rest_seconds of et-calf
    });

    it("aborts with no body when an exercise is left out of every group (AC2)", () => {
        const result = buildSupersetRegroupedRequest(fixtureRoutine, {
            groups: [{ members: [{ exercise_template_id: "et-leg" }, { exercise_template_id: "et-hamstring" }] }],
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toContain("et-glute");
        expect(result.error).toContain("et-calf");
    });

    it("aborts with no body when an exercise appears in more than one group (AC2)", () => {
        const result = buildSupersetRegroupedRequest(fixtureRoutine, {
            groups: [
                { members: [{ exercise_template_id: "et-leg" }] },
                { members: [{ exercise_template_id: "et-leg" }, { exercise_template_id: "et-hamstring" }] },
                { members: [{ exercise_template_id: "et-glute" }] },
                { members: [{ exercise_template_id: "et-calf" }] },
            ],
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toContain("more than one group");
    });

    it("is idempotent: regrouping into the same structure twice yields the same body", () => {
        const input = {
            groups: [
                { members: [{ exercise_template_id: "et-leg" }, { exercise_template_id: "et-hamstring" }, { exercise_template_id: "et-glute" }] },
                { members: [{ exercise_template_id: "et-calf" }] },
            ],
            restSecondsBetweenGroups: 120,
        };
        const first = buildSupersetRegroupedRequest(fixtureRoutine, input);
        expect(first.ok).toBe(true);
        if (!first.ok) return;

        // Simulate re-reading the routine after the first write.
        const afterFirstWrite: Routine = {
            ...fixtureRoutine,
            exercises: first.body.exercises.map((ex, i) => ({
                index: i,
                title: fixtureRoutine.exercises.find(e => e.exercise_template_id === ex.exercise_template_id)!.title,
                rest_seconds: ex.rest_seconds ?? null,
                notes: ex.notes ?? "",
                exercise_template_id: ex.exercise_template_id,
                supersets_id: ex.superset_id ?? null,
                sets: ex.sets.map((s, si) => ({ index: si, ...s, weight_kg: s.weight_kg ?? null, reps: s.reps ?? null, rep_range: s.rep_range ?? null, distance_meters: s.distance_meters ?? null, duration_seconds: s.duration_seconds ?? null, rpe: s.rpe ?? null, custom_metric: s.custom_metric ?? null })),
            })),
        };

        const second = buildSupersetRegroupedRequest(afterFirstWrite, input);
        expect(second.ok).toBe(true);
        if (!second.ok) return;
        expect(second.body).toEqual(first.body);
    });
});
