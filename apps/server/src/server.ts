#!/usr/bin/env bun

import "dotenv/config";
import { serve } from "bun";
import app from "./index";

const port = parseInt(process.env.PORT || "3000", 10);

console.log(`Starting STL Shelf server on port ${port}...`);

serve({
  port,
  fetch: app.fetch,
  error: (error) => {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`🚀 STL Shelf server running at http://localhost:${port}`);
console.log(`📁 Data directory: ${process.env.DATA_DIR || '/data'}`);