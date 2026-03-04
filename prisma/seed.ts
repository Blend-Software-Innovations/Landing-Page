import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.AUTH_ADMIN_EMAIL || "admin@example.com";
  const adminPass = process.env.AUTH_ADMIN_PASSWORD || "password123";
  const hash = await bcrypt.hash(adminPass, 10);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: hash, role: "OWNER" }
  });

  const product = await prisma.product.upsert({
    where: { sku: "PEN-001" },
    update: {},
    create: {
      name: "Signature Resin Pen",
      type: "PHYSICAL",
      category: "Resin",
      brand: "Sahariar's Pen",
      sku: "PEN-001",
      basePrice: 4999,
      description: "Handmade resin pen with polished finish.",
      variants: {
        create: [
          { name: "Standard", size: "140mm", color: "Blue", price: 4999, stockQty: 50, weight: 40, sku: "PEN-001-BLU" },
          { name: "Premium", size: "140mm", color: "Rose", price: 5299, stockQty: 30, weight: 42, sku: "PEN-001-ROS" }
        ]
      }
    }
  });

  await prisma.template.createMany({
    data: [
      { name: "Cosmetics", description: "Skincare launch template", config: { category: "Cosmetics" } },
      { name: "Electronics", description: "Gadget launch template", config: { category: "Electronics" } },
      { name: "Clothing", description: "Fashion template", config: { category: "Clothing" } },
      { name: "Food", description: "Food/grocery template", config: { category: "Food" } }
    ],
    skipDuplicates: true
  });

  await prisma.landingPage.createMany({
    data: [
      {
        slug: "signature-pen",
        title: "Signature Resin Pen",
        description: "Handmade resin pen",
        config: { productId: product.id, theme: "default" }
      }
    ],
    skipDuplicates: true
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

