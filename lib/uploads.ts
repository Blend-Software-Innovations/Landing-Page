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
  const key = `uploads/${Date.now()}-${sanitizeName(filename)}`;
  const client = new S3Client({
    region,
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
