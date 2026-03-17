export * from './types';
export * from './state';
export * from './normalizer';
export * from './factory';
export * from './authorizer';

import { AuthorizerOptions } from './types';
import { AuthorizerFacade } from './authorizer';

export async function createAuthorizer(options?: AuthorizerOptions) {
  const authorizer = new AuthorizerFacade();
  await authorizer.initialize(options);
  return authorizer;
}
