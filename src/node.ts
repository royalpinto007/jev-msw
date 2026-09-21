import { setupServer } from "msw/node";
import type { JevHandler } from "./types.js";
export const setupJevServer = (...handlers: JevHandler[]) => setupServer(...handlers);
