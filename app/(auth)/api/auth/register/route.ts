export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import bcrypt from "bcryptjs";
import { signToken, setAuthCookie } from "@/lib/auth";
import {
  isDatabaseConnectionError,
  saveLocalAuthUser,
} from "@/lib/dbFallback";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { email, name, password } = await req.json();

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: "Email, name, and password are required" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;

  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const [createdUser] = await db
      .insert(usersTable)
      .values({ email, name, passwordHash })
      .returning();

    user = createdUser;
  } catch (error) {
    if (!isDatabaseConnectionError(error)) {
      throw error;
    }

    const existingLocalUser = await saveLocalAuthUser({
      email,
      name,
      passwordHash,
    });

    user = existingLocalUser;
  }

  const token = await signToken({
    id: user.id,
    email: user.email,
    name: user.name,
  });

  const response = NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    credits: user.credits,
  });
  setAuthCookie(response, token);
  return response;
}
