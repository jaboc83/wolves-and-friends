// Creates the request-scoped connector facade consumed by app routes.
import { createConnectors } from "./contract.mjs";
import { getConnectorBinding } from "./context";

/** Keep invocation context on this request; never cache it across visitors. */
export function connectorsForRequest() {
  return createConnectors(getConnectorBinding());
}
export type {
  ConnectorContext,
  ConnectorResult,
  ConnectorFailureStatus,
  Json,
} from "./contract.mjs";
