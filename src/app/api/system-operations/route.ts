import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, decodeAuthSession } from "@/lib/auth-session";
import {
  getLatestSystemOperationJobs,
  getSystemOperationJob,
  runSystemOperation,
  type SystemOperationAction,
} from "@/lib/system-operations-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getSession = async () => {
  const raw = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeAuthSession(raw);
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const job = getSystemOperationJob(id);
    if (!job) {
      const jobs = getLatestSystemOperationJobs(20);
      return Response.json({ job: null, jobs, missing: true });
    }
    return Response.json({ job });
  }

  return Response.json({ jobs: getLatestSystemOperationJobs(20) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { action?: string } = {};
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  if (
    body.action !== "migrate-notion" &&
    body.action !== "sync-option-colors"
  ) {
    return new Response("Unsupported action", { status: 400 });
  }

  const job = runSystemOperation(body.action as SystemOperationAction);
  return Response.json({ job });
}
