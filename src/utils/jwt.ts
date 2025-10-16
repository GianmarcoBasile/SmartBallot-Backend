import jwt from "jsonwebtoken";
import type { USER } from "../types.js";

// Generate access token
export function generateAccessToken(user: USER): string {
  const access_token = jwt.sign({ user }, process.env.JWT_ACCESS_SECRET ?? "", {
    expiresIn: "1h",
  });
  return access_token;
}

// Generate refresh token
export function generateRefreshToken(user: USER): string {
  const refresh_token = jwt.sign(
    { user },
    process.env.JWT_REFRESH_SECRET ?? "",
    { expiresIn: "7d" },
  );
  return refresh_token;
}

// Verify token and return user data if valid
export async function verifyToken(
  type: "access" | "refresh",
  token: string,
): Promise<USER | null> {
  try {
    const secret =
      type === "access"
        ? process.env.JWT_ACCESS_SECRET
        : process.env.JWT_REFRESH_SECRET;
    const decoded = jwt.verify(token, secret ?? "") as { user: USER };
    return decoded.user;
  } catch (error) {
    return null;
  }
}
