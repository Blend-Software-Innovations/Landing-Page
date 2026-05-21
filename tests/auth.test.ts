import { describe, expect, test, beforeEach } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

beforeEach(() => {
  process.env.AUTH_ADMIN_EMAIL = "admin@example.com";
  process.env.AUTH_ADMIN_PASSWORD = "password123";
  process.env.AUTH_JWT_SECRET = "test-secret-123456789";
  process.env.AUTH_REFRESH_SECRET = "test-refresh-123456789";
});

if (!hasDb) {
  describe.skip("auth core", () => {
    test("requires database", () => {});
  });
} else {
  describe("auth core", () => {
    test("seed and login", async () => {
      const auth = await import("../lib/auth");
      await auth.ensureAdminSeed();
      const user = await auth.verifyCredentials("admin@example.com", "password123");
      expect(user).toBeTruthy();
    });

    test("refresh rotation", async () => {
      const auth = await import("../lib/auth");
      await auth.ensureAdminSeed();
      const user = await auth.verifyCredentials("admin@example.com", "password123");
      expect(user).toBeTruthy();
      const tokens = await auth.issueTokens(user!);
      const rotated = await auth.rotateRefreshToken(tokens.refreshToken);
      expect(rotated).toBeTruthy();
    });
  });
}
