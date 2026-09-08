/**
 * Promotes an existing account to admin, or creates a new admin.
 *
 *   npm run make-admin -- you@example.com
 *   npm run make-admin -- you@example.com "Your Name" yourpassword
 *
 * The first form only works if the account already exists.
 */
import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/db.ts";
import User from "../models/User.ts";

const [email, name, password] = process.argv.slice(2);

if (!email) {
  console.error("Usage: npm run make-admin -- <email> [name] [password]");
  process.exit(1);
}

await connectDatabase();

const existing = await User.findOne({ email: email.toLowerCase() });

if (existing) {
  existing.role = "admin";
  existing.isActive = true;
  existing.deletedAt = null;
  await existing.save();
  console.log(`✅ ${existing.email} is now an admin`);
} else {
  if (!name || !password) {
    console.error(`No account for ${email}. Pass a name and password to create one:`);
    console.error(`  npm run make-admin -- ${email} "Admin Name" somepassword`);
    await disconnectDatabase();
    process.exit(1);
  }

  const created = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
  });
  console.log(`✅ Created admin ${created.email}`);
}

await disconnectDatabase();
