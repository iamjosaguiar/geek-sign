import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import bcrypt from "bcryptjs";

async function seedUsers() {
  const password = await bcrypt.hash("GeekSign2024!", 12);

  const usersToCreate = [
    {
      email: "jos@profitgeeks.com.au",
      name: "Jos",
      password,
      plan: "free",
    },
    {
      email: "admin@ambrit.com.au",
      name: "Admin",
      password,
      plan: "free",
    },
  ];

  for (const user of usersToCreate) {
    try {
      await db.insert(users).values(user).onConflictDoNothing();
      console.log(`Created user: ${user.email}`);
    } catch (error) {
      console.error(`Error creating user ${user.email}:`, error);
    }
  }

  console.log("Done seeding users!");
  process.exit(0);
}

seedUsers();
