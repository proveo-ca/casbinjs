export const MODEL_FIXTURE = `
[request_definition]
r = sub, res, org, act
[policy_definition]
p = sub, res, org, act, eft
[role_definition]
g = _, _, _
g2 = _, _, _
g3 = _, _
[policy_effect]
e = some(where (p.eft == allow))
[matchers]
m = (p.sub == 'public' || r.sub == p.sub || g(r.sub, p.sub, r.org)) && \
    (r.org == p.org) && \
    (r.res == p.res || keyMatch(r.res, p.res) || g2(r.res, p.res, r.org)) && \
    (r.act == p.act || g3(r.act, p.act))
`.trim();
