import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HevyClient } from "hevy-ts";

export function registerWebhookTools(server: McpServer, hevy: HevyClient) {
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
}
