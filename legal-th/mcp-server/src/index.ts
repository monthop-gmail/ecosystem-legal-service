import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import { registerTools } from "./tools/index.js";
import { registerPrompts } from "./prompts/index.js";
import { registerResources } from "./resources/index.js";

const app = express();
app.use(express.json());

const server = new McpServer({
  name: "legal-th",
  version: "0.1.0",
});

// Register all MCP components
registerTools(server);
registerPrompts(server);
registerResources(server);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "legal-th-mcp", version: "0.1.0" });
});

// MCP endpoint
app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    transport.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const PORT = process.env.PORT || 4100;
app.listen(PORT, () => {
  console.log(`🏛️ legal-th MCP server running on port ${PORT}`);
});
