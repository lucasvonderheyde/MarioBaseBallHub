import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

function sanitizeUsernameBase(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 20);
  return cleaned.length >= 2 ? cleaned : "player";
}

export async function suggestUniqueUsername(seed: string): Promise<string> {
  const base = sanitizeUsernameBase(seed);
  const [existingBase] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, base))
    .limit(1);
  if (!existingBase) return base;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `${base}${Math.floor(Math.random() * 9000) + 1000}`;
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);
    if (!taken) return candidate;
  }

  return `${base}${Date.now().toString().slice(-6)}`;
}
