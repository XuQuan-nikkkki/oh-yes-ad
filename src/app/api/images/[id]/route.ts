import { requireAuthenticatedEmployee } from "@/lib/api-permissions";
import { IMAGE_ID, imageReadUrl } from "@/lib/image-storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthenticatedEmployee();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!IMAGE_ID.test(id)) return new Response("图片不存在", { status: 404 });
  try {
    const url = await imageReadUrl(id);
    return new Response(null, { status: 302, headers: {
      Location: url,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    } });
  } catch (error) {
    const missing = error instanceof Error && error.name === "NoSuchKey";
    return new Response(missing ? "图片不存在" : "图片暂时无法读取", { status: missing ? 404 : 503 });
  }
}
