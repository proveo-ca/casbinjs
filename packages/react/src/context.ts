import { createContext } from 'react';
import type { CasbinContextValue } from './types';

export const CasbinContext = createContext<CasbinContextValue | null>(null);
