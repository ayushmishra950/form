/** Read-only: prints every account, so you can see what is actually in the DB. */
import { connectDatabase, disconnectDatabase } from "../config/db.ts";
import User from "../models/User.ts";
import Form from "../models/Form.ts";

await connectDatabase();

const users = await User.find({}).sort({ createdAt: 1 });
const formCount = await Form.countDocuments({});

console.log(`\n${users.length} account(s), ${formCount} form(s):\n`);
for (const user of users) {
  const status = user.deletedAt ? "deleted" : user.isActive ? "active" : "inactive";
  console.log(`  ${user.email.padEnd(32)} role=${user.role.padEnd(5)} ${status}`);
}
console.log("");

await disconnectDatabase();
