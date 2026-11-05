import { describe, expect, it } from "vitest";
import { verifyPassword } from "better-auth/crypto";
import { buildAdminBootstrap, parseBootstrapCredentials } from "../scripts/prepare-admin-bootstrap.mjs";

const valid = {
  email: "ADMIN@EXAMPLE.COM",
  name: "Initial Administrator",
  password: "correct-horse-battery-staple-2026",
};

describe("offline administrator bootstrap", () => {
  it("accepts JSON with and without UTF-8 BOM", () => {
    const json = JSON.stringify(valid);

    expect(
      parseBootstrapCredentials("\uFEFF" + json),
    ).toEqual(valid);

    expect(
      parseBootstrapCredentials(json),
    ).toEqual(valid);
  });

  it("produces transactional SQL using a verifiable Better Auth hash", async () => {
    const result = await buildAdminBootstrap(valid);

    expect(
      await verifyPassword({
        hash: result.passwordHash,
        password: valid.password,
      }),
    ).toBe(true);

    expect(result.sql).toContain("START TRANSACTION;");
    expect(result.sql).toContain("COMMIT;");
    expect(result.sql).toContain("NOT EXISTS");
    expect(result.sql).toContain("'credential'");
    expect(result.sql).toContain("'better_auth'");
    expect(result.sql).toContain("'admin'");
    expect(result.sql).toContain("'active'");
    expect(result.sql).toContain("'a1_beginner'");
    expect(result.sql).toContain("'conversation'");
    expect(result.sql).toContain("UTC_TIMESTAMP(3)");
    expect(result.sql).not.toContain(valid.password);

    expect(
      (result.sql.match(/INSERT INTO `/g) ?? []).length
    ).toBe(5);
  });

  it("requires an exclusive lock and seven empty identity tables", async () => {
    const { sql } = await buildAdminBootstrap(valid);

    expect(sql.indexOf("GET_LOCK(")).toBeLessThan(
      sql.indexOf("START TRANSACTION;"),
    );

    for (const table of [
      "user",
      "account",
      "session",
      "verification",
      "app_users",
      "users_profile",
      "admin_audit_logs",
    ]) {
      expect(sql).toContain(
        "NOT EXISTS (SELECT 1 FROM `" + table + "`)",
      );
    }

    expect(sql).toContain(
      "RELEASE_LOCK('zaban_admin_bootstrap_v1')",
    );
  });

  it("aborts before credential insertion if bootstrap was skipped", async () => {
    const { sql } = await buildAdminBootstrap(valid);

    expect(sql).toContain(
      "SET @zaban_created = ROW_COUNT();",
    );

    expect(sql).toContain(
      "PREPARE zaban_bootstrap_assert FROM @zaban_guard_sql;",
    );

    expect(sql).toContain(
      "__zaban_bootstrap_precondition_failed__",
    );

    expect(sql.indexOf("DEALLOCATE PREPARE")).toBeLessThan(
      sql.indexOf("INSERT INTO `account`"),
    );

    expect(sql.indexOf("COMMIT;")).toBeLessThan(
      sql.indexOf("RELEASE_LOCK("),
    );
  });
  it("rejects invalid email and weak passwords", async () => {
    await expect(
      buildAdminBootstrap({ ...valid, email: "invalid" }),
    ).rejects.toThrow("email");

    await expect(
      buildAdminBootstrap({ ...valid, password: "12345678" }),
    ).rejects.toThrow("16-128");

    await expect(
      buildAdminBootstrap({ ...valid, name: "" }),
    ).rejects.toThrow("display name");
  });

  it("encodes untrusted text rather than interpolating SQL", async () => {
    const maliciousName = "X'); DROP TABLE user; --";

    const result = await buildAdminBootstrap({
      ...valid,
      name: maliciousName,
    });

    expect(result.sql).not.toContain(maliciousName);
    expect(result.sql).not.toMatch(/\bDROP TABLE\b/);
    expect(result.sql).toContain("CONVERT(0x");
  });
});