import { AuthorizationPayload, AuthorizerOptions, PermissionGrant } from './types';

export class InputNormalizer {
  public static fromPayload(payload: AuthorizationPayload): PermissionGrant[] {
    return payload.permissions || [];
  }

  public static fromOptions(options: AuthorizerOptions): PermissionGrant[] {
    return options.permissions || [];
  }
}
