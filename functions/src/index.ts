import { onCall } from "firebase-functions/v2/https";
import { forensicAuditFlow } from "./forensicAuditFlow";

// Production Infrastructure (February 2026 Standards)
export const forensicAudit = onCall({
    timeoutSeconds: 540, // 9 Minute Max for complex audits
    memory: "2GiB",       // High RAM for JSON synthesis
    secrets: ["GOOGLE_API_KEY"],
    cors: true,          // Required for client-side invocation
}, async (request) => {
    return await forensicAuditFlow(request.data);
});