import bcrypt from "bcryptjs";
import { storage } from "./storage";

async function seed() {
  console.log("Seeding database with initial users...");

  try {
    const adminPassword = await bcrypt.hash("Test@1234", 12);
    const salesPassword = await bcrypt.hash("Test@1234", 12);

    const adminUser = await storage.createUser({
      email: "admin@hackure.in",
      passwordHash: adminPassword,
      role: "admin",
    });

    const salesUser = await storage.createUser({
      email: "sales@hackure.in",
      passwordHash: salesPassword,
      role: "sales",
    });

    console.log("✓ Created admin@hackure.in (role: admin)");
    console.log("✓ Created sales@hackure.in (role: sales)");
    console.log("Both users have password: Test@1234");
    console.log("\nDatabase seeding completed successfully!");
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
