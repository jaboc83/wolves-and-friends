/** Use in a Site server route. Connection selection and credentials stay in the host. */
export function createConnectors(binding) {
    return {
        async getContext() {
            if (typeof window !== "undefined") {
                throw new Error("Connected apps are only available in Site server routes.");
            }
            try {
                if (!binding?.getContext)
                    return { status: "binding_unavailable" };
                const context = await binding.getContext();
                if (context?.status === "success" &&
                    Array.isArray(context.connectors)) {
                    return {
                        status: "success",
                        connectors: context.connectors.map((connector) => {
                            if (!connector ||
                                typeof connector.connectorId !== "string" ||
                                !["enabled", "disabled"].includes(connector.policy) ||
                                (connector.tools !== null && !Array.isArray(connector.tools))) {
                                throw new Error("Invalid connector context");
                            }
                            return {
                                connectorId: connector.connectorId,
                                policy: connector.policy,
                                tools: connector.tools?.map((tool) => {
                                    if (!tool ||
                                        typeof tool.actionName !== "string" ||
                                        (tool.description !== undefined &&
                                            typeof tool.description !== "string") ||
                                        !tool.inputSchema ||
                                        typeof tool.inputSchema !== "object" ||
                                        Array.isArray(tool.inputSchema)) {
                                        throw new Error("Invalid connector tool");
                                    }
                                    return {
                                        actionName: tool.actionName,
                                        ...(tool.description !== undefined
                                            ? { description: tool.description }
                                            : {}),
                                        inputSchema: tool.inputSchema,
                                    };
                                }) ?? null,
                            };
                        }),
                    };
                }
                switch (context?.status) {
                    case "request_context_expired":
                    case "internal_error":
                    case "binding_unavailable":
                    case "upstream_error":
                        return { status: context.status };
                    default:
                        return { status: "upstream_error" };
                }
            }
            catch {
                return { status: "upstream_error" };
            }
        },
        async invoke(connectorId, actionName, args) {
            if (typeof window !== "undefined") {
                throw new Error("Connected apps are only available in Site server routes.");
            }
            if (!binding) {
                return {
                    status: "binding_unavailable",
                    message: "This runtime does not provide connected apps for this request.",
                };
            }
            try {
                // Preserve the host's status, message, result and optional diagnostics.
                // Do not replay a call after a transport failure: it may have completed.
                return await binding.invoke(connectorId, actionName, args);
            }
            catch {
                return {
                    status: "upstream_error",
                    message: "The app did not return a confirmed result. The action may have completed; check before trying again.",
                };
            }
        },
    };
}
