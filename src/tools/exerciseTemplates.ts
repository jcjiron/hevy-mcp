import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HevyClient, ExerciseTemplate } from "hevy-ts";

// Per-process cache: non-custom exercise templates don't change within a
// session, so repeated lookups (e.g. across several listRoutines /
// classification calls) shouldn't re-fetch them one by one.
const templateCache = new Map<string, ExerciseTemplate>();

export function registerExerciseTemplateTools(server: McpServer, hevy: HevyClient) {
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
            templateCache.set(exerciseTemplateId, template);
            return { content: [{ type: "text", text: JSON.stringify(template, null, 2) }] };
        }
    );

    server.registerTool(
        "getExerciseTemplatesByIds",
        {
            title: "Get Exercise Templates By IDs",
            description: "Batch-resolve up to 200 exercise template IDs in one call (e.g. primary_muscle_group, equipment), instead of one getExerciseTemplateById call per ID. Cached in-memory for the life of the server process.",
            inputSchema: { ids: z.array(z.string()).max(200) },
        },
        async ({ ids }) => {
            const uniqueIds = [...new Set(ids)];
            const found: ExerciseTemplate[] = [];
            const notFound: string[] = [];

            for (const id of uniqueIds) {
                const cached = templateCache.get(id);
                if (cached) {
                    found.push(cached);
                    continue;
                }
                try {
                    const template = await hevy.getExerciseTemplateById(id);
                    templateCache.set(id, template);
                    found.push(template);
                } catch (error: any) {
                    notFound.push(id);
                }
            }

            return { content: [{ type: "text", text: JSON.stringify({ templates: found, notFound }, null, 2) }] };
        }
    );
}
