import { env } from "cloudflare:workers";
import { recordAnalytics } from "../../../analytics-ingestion";

export async function POST(request: Request) {
  return recordAnalytics(request, env.DB);
}
