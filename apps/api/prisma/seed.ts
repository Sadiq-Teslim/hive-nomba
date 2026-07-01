import { PrismaClient } from "@prisma/client";
import { nairaToKobo } from "../src/utils/money.js";

const prisma = new PrismaClient();

/**
 * Reset the Hive schema and seed three varied demo stores (fashion, food,
 * electronics) with full store info and catalogues — a clean, rich demo dataset.
 *
 * The FIRST store's phone is the merchant; any other number that chats with Hive
 * becomes a customer of the most-recently-active onboarded store.
 */

interface StoreSeed {
  phone: string;
  businessName: string;
  ownerName: string;
  category: string;
  about: string;
  businessHours: string;
  address: string;
  deliveryInfo: string;
  contactInfo: string;
  products: { name: string; priceNaira: number; stock: number; description: string }[];
}

const STORES: StoreSeed[] = [
  {
    phone: "2348100000001",
    businessName: "Bella's Fashion Hub",
    ownerName: "Bella",
    category: "fashion",
    about: "Handmade African fashion and accessories.",
    businessHours: "Mon–Sat, 9am–7pm",
    address: "12 Adeniran Ogunsanya, Surulere, Lagos",
    deliveryInfo: "Lagos delivery ₦2,500; nationwide via GIG (2–4 days).",
    contactInfo: "0801 234 5678",
    products: [
      { name: "Ankara Gown", priceNaira: 18500, stock: 12, description: "Handmade Ankara gown, all sizes." },
      { name: "Men's Kaftan", priceNaira: 25000, stock: 8, description: "Premium cotton kaftan with cap." },
      { name: "Gele Headwrap", priceNaira: 4500, stock: 30, description: "Stiff aso-oke gele, assorted colours." },
      { name: "Beaded Slippers", priceNaira: 7500, stock: 20, description: "Comfortable handmade beaded slippers." },
      { name: "Silk Scarf", priceNaira: 6000, stock: 15, description: "Lightweight printed silk scarf." },
    ],
  },
  {
    phone: "2348100000002",
    businessName: "Mama Nkechi's Kitchen",
    ownerName: "Nkechi",
    category: "food",
    about: "Homemade Nigerian meals and small chops, cooked fresh daily.",
    businessHours: "Daily, 8am–9pm",
    address: "5 Allen Avenue, Ikeja, Lagos",
    deliveryInfo: "Free within Ikeja; ₦1,500 elsewhere in Lagos.",
    contactInfo: "0809 876 5432",
    products: [
      { name: "Jollof Rice", priceNaira: 2500, stock: 100, description: "Smoky party jollof, per plate." },
      { name: "Pounded Yam & Egusi", priceNaira: 3500, stock: 50, description: "Pounded yam with rich egusi soup." },
      { name: "Suya", priceNaira: 1500, stock: 200, description: "Spicy beef suya, per stick." },
      { name: "Moi Moi", priceNaira: 800, stock: 80, description: "Steamed bean pudding, per wrap." },
      { name: "Chin Chin", priceNaira: 1500, stock: 40, description: "Crunchy fried chin chin, per pack." },
      { name: "Zobo Drink", priceNaira: 1000, stock: 60, description: "Chilled hibiscus drink, per bottle." },
    ],
  },
  {
    phone: "2348100000003",
    businessName: "TechBox Gadgets",
    ownerName: "Tunde",
    category: "electronics",
    about: "Quality phone accessories and gadgets, warranty included.",
    businessHours: "Mon–Sat, 10am–8pm",
    address: "Computer Village, Ikeja, Lagos",
    deliveryInfo: "Same-day in Lagos ₦2,000; nationwide 2–4 days.",
    contactInfo: "0701 222 3333",
    products: [
      { name: "Power Bank 20000mAh", priceNaira: 12000, stock: 25, description: "Fast-charging 20,000mAh power bank." },
      { name: "Wireless Earbuds", priceNaira: 18000, stock: 30, description: "Bluetooth 5.3 earbuds with case." },
      { name: "Fast Charger 65W", priceNaira: 9000, stock: 40, description: "65W USB-C super-fast charger." },
      { name: "Phone Case", priceNaira: 3500, stock: 100, description: "Shockproof clear phone case." },
      { name: "USB-C Cable", priceNaira: 2500, stock: 150, description: "Braided 2m USB-C cable." },
      { name: "Bluetooth Speaker", priceNaira: 22000, stock: 15, description: "Portable waterproof speaker." },
    ],
  },
];

async function main() {
  // Reset (delete in FK-safe order).
  await prisma.supportTicket.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.merchant.deleteMany();
  console.log("🧹 Reset Hive data.");

  for (const s of STORES) {
    const merchant = await prisma.merchant.create({
      data: {
        whatsappPhone: s.phone,
        businessName: s.businessName,
        ownerName: s.ownerName,
        category: s.category,
        about: s.about,
        businessHours: s.businessHours,
        address: s.address,
        deliveryInfo: s.deliveryInfo,
        contactInfo: s.contactInfo,
        onboarded: true,
        products: {
          create: s.products.map((p) => ({
            name: p.name,
            description: p.description,
            priceKobo: nairaToKobo(p.priceNaira),
            stock: p.stock,
          })),
        },
      },
    });
    console.log(`✅ ${merchant.businessName} (${s.category}) — ${s.products.length} products · merchant ${s.phone}`);
  }

  console.log("\nMerchant phones: chat from one of these to manage that store.");
  console.log("Any other number → customer of the most recent onboarded store.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
