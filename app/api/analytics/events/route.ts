import { env } from "cloudflare:workers";
import { recordAnalytics } from "../../../analytics-ingestion";
import { hasAnalyticsAccess } from "../../../analytics-access";

export async function POST(request: Request) {
  const userId = request.headers.get("oai-authenticated-user-id") ?? "";
  const email = request.headers.get("oai-authenticated-user-email") ?? "";
  if (hasAnalyticsAccess({ userId, email }, env.ANALYTICS_ALLOWED_EMAILS)) return new Response(null, { status: 204 });
  return recordAnalytics(request, env.DB);
}
