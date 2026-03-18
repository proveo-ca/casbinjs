import { Enforcer, MemoryAdapter, Model, newEnforcer } from "casbin-core";
import { AuthorizerOptions } from "./types";

const FALLBACK_MODEL = `
[request_definition]
r = sub, obj, act
[policy_definition]
p = sub, obj, act
[policy_effect]
e = some(where (p.eft == allow))
[matchers]
m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
`.trim();

export class EnforcerFactory {
  public static async createEnforcer(options: AuthorizerOptions): Promise<Enforcer> {
    const model = new Model(options.model ?? FALLBACK_MODEL);
    const adapter = new MemoryAdapter(options.policies ?? []);
    return newEnforcer(model, adapter);
  }
}
