import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";

type UploadResult = {
  url: string;
  provider: "cloudinary" | "s3" | "local";
};

type UploadTarget = "public" | "private";

const publicUploadDir = path.join(process.cwd(), "public", "uploads");
const privateUploadDir = path.join(process.cwd(), "uploads");

const hasCloudinary =
  Boolean(process.env.CLOUDINARY_URL) ||
  (Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET));

const hasS3 =
  Boolean(process.env.S3_BUCKET) &&
  Boolean(process.env.S3_REGION) &&
  Boolean(process.env.S3_ACCESS_KEY_ID) &&
  Boolean(process.env.S3_SECRET_ACCESS_KEY);

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeName(input: string) {
  return input.replace(/[^\w.-]+/g, "-").toLowerCase();
}

function configureCloudinary() {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
    return;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

async function uploadToCloudinary(filepath: string, filename: string): Promise<UploadResult> {
  configureCloudinary();
  const publicId = `landing/${Date.now()}-${sanitizeName(filename)}`;
  const result = await cloudinary.uploader.upload(filepath, {
    public_id: publicId,
    resource_type: "image"
  });
  return { url: result.secure_url, provider: "cloudinary" };
}

async function uploadToS3(filepath: string, filename: string): Promise<UploadResult> {
  const bucket = process.env.S3_BUCKET as string;
  const region = process.env.S3_REGION as string;
  // S3_ENDPOINT lets this work with S3-compatible providers like DigitalOcean Spaces
  // (e.g. https://blr1.digitaloceanspaces.com). Left unset, it defaults to AWS S3.
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const key = `uploads/${Date.now()}-${sanitizeName(filename)}`;
  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string
    }
  });
  const body = fs.readFileSync(filepath);
  const contentType = filename.endsWith(".png")
    ? "image/png"
    : filename.endsWith(".webp")
      ? "image/webp"
      : filename.endsWith(".jpg") || filename.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read"
    })
  );

  const publicBase =
    process.env.S3_PUBLIC_URL || `https://${bucket}.s3.${region}.amazonaws.com`;
  return { url: `${publicBase}/${key}`, provider: "s3" };
}

async function uploadToLocal(filepath: string, filename: string, target: UploadTarget): Promise<UploadResult> {
  const dir = target === "public" ? publicUploadDir : privateUploadDir;
  ensureDir(dir);
  const safeName = `${Date.now()}-${sanitizeName(filename)}`;
  const dest = path.join(dir, safeName);
  fs.copyFileSync(filepath, dest);
  const url = target === "public" ? `/uploads/${safeName}` : `/uploads/${safeName}`;
  return { url, provider: "local" };
}

// Magic-byte sniffing — the client-declared mimetype is attacker-controlled, and
// SVG/HTML disguised as an image becomes stored XSS when served from our origin.
// Only raster formats are allowed anywhere user bytes are accepted.
const IMAGE_SIGNATURES: Array<{ ext: string; mime: string; check: (buf: Buffer) => boolean }> = [
  {
    ext: "jpg",
    mime: "image/jpeg",
    check: (b) => b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  },
  {
    ext: "png",
    mime: "image/png",
    check: (b) =>
      b.length > 7 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a
  },
  {
    ext: "webp",
    mime: "image/webp",
    check: (b) => b.length > 11 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP"
  }
];

export function sniffImageType(filepath: string): { ext: string; mime: string } | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filepath, "r");
    const header = Buffer.alloc(16);
    fs.readSync(fd, header, 0, 16, 0);
    const match = IMAGE_SIGNATURES.find((sig) => sig.check(header));
    return match ? { ext: match.ext, mime: match.mime } : null;
  } catch {
    return null;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

export async function uploadImage(
  filepath: string,
  filename: string,
  target: UploadTarget = "public"
): Promise<UploadResult> {
  if (hasCloudinary) {
    return uploadToCloudinary(filepath, filename);
  }
  if (hasS3) {
    return uploadToS3(filepath, filename);
  }
  return uploadToLocal(filepath, filename, target);
}
