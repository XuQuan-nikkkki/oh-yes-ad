import { requireAuthenticatedEmployee, requireProjectWritePermission } from "@/lib/api-permissions";
import { createImageUpload, InvalidImageUpload } from "@/lib/image-storage";
import { validImageUpload } from "@/lib/image-upload-config";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;
  const auth = await requireAuthenticatedEmployee();
  if (auth.response || !auth.employee) return auth.response;
  let body;
  try { body = await req.json(); } catch { return new Response("上传参数无效", { status: 400 }); }
  if (!body || typeof body !== "object") return new Response("上传参数无效", { status: 400 });
  try {
    if (body.action === "prepare") {
      if (!validImageUpload(body.size, body.contentType)) return new Response("请选择 20 MB 以内的 JPG、PNG 或 WebP 图片", { status: 400 });
      return Response.json(await createImageUpload(body.size, body.contentType), { headers: { "Cache-Control": "no-store" } });
    }
    return new Response("上传参数无效", { status: 400 });
  } catch (error) {
    if (error instanceof InvalidImageUpload) return new Response(error.message, { status: 400 });
    return new Response("图片处理暂时失败，请重试保存", { status: 503 });
  }
}
