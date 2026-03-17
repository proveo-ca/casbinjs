import { useContext } from 'react';
import { CasbinContext } from './context';
import type { CasbinContextValue } from './types';

export function useCasbin(): CasbinContextValue {
  const context = useContext(CasbinContext);

  if (!context) {
    throw new Error('useAuthz must be used within an AuthzProvider');
  }

  return context;
}
