import { extendZodWithOpenApi } from "@hono/zod-openapi";
import { z } from "zod/v4";

extendZodWithOpenApi(z);

export { z };
