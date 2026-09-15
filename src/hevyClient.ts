import { HevyClient } from "hevy-ts";
import dotenv from "dotenv";

// The MCP transport is JSON-RPC over stdio, so nothing but protocol
// messages may hit stdout. dotenv's "injecting env" banner would corrupt
// that framing.
dotenv.config({ quiet: true });

const apiKey = process.env.HEVY_API_KEY || "";

export const hevy = new HevyClient(apiKey);
