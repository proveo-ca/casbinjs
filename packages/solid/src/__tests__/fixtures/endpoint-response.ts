import endpointResponse from "./endpoint-response.json";
import type { AuthorizerOptions } from "@casbinjs/core";

interface EndpointResponseFixture {
  subject: string;
  organization: string;
  policies: string[][];
}

export function getEndpointResponseFixture(): EndpointResponseFixture {
  return endpointResponse as EndpointResponseFixture;
}

export function toAuthorizerOptions(response: EndpointResponseFixture): AuthorizerOptions {
  return {
    subject: response.subject,
    organization: response.organization,
    policies: response.policies,
  };
}
