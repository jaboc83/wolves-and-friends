// Types the local Sites connector preview binding and hosted Worker environment.
declare module "virtual:sites-connector-preview" {
  const binding: import("./contract.mjs").ConnectorBinding;
  export default binding;
}

// Only the local preview uses an environment binding. Hosted Sites receive the
// request-scoped capability through ctx.props.CONNECTORS in sites-worker.ts.
declare namespace Cloudflare {
  interface Env {
    CONNECTORS?: import("./contract.mjs").ConnectorBinding;
  }
}
