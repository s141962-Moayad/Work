import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { handler, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

const dir = () => process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads");
const MAX = 4 * 1024 * 1024;

function sniff(b: Buffer): "png" | "jpg" | "webp" | null {
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

/** Image upload for menu photos / logo. Type is decided from file contents, never from the filename. */
export const POST = handler({ auth: "admin", rate: ["upload", 60, 10 * 60_000] }, async ({ req, user, ip }) => {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "تعذّر قراءة الملف المرفوع.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "لم يتم اختيار ملف.");
  if (file.size > MAX) throw new ApiError(400, "حجم الصورة كبير؛ الحد الأقصى ٤ ميغابايت.");
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) throw new ApiError(400, "صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WebP.");
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await mkdir(dir(), { recursive: true });
  await writeFile(join(dir(), name), buf);
  await audit(user, "upload", "image", name, { size: buf.length }, ip);
  return { url: `/uploads/${name}` };
});
