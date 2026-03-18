import { createContext } from "solid-js";
import type { CasbinContextValue } from "./types";

export const CasbinContext = createContext<CasbinContextValue | null>(null);
