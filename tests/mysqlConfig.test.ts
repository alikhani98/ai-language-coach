import { describe, expect, it } from "vitest";
import {
  getMySqlConnectionConfig,
  getMySqlPoolOptions,
} from "@/lib/db/config";

const validEnvironment = {
  MYSQL_HOST: "127.0.0.1",
  MYSQL_PORT: "3306",
  MYSQL_DATABASE: "jtphyqur_zaban_db",
  MYSQL_USER: "jtphyqur_zaban_db",
  MYSQL_PASSWORD: "test-only-password",
};

describe("MySQL connection configuration", () => {
  it("requires every server-only connection value", () => {
    const withoutPassword = { ...validEnvironment, MYSQL_PASSWORD: undefined };
    expect(() => getMySqlConnectionConfig(withoutPassword)).toThrow();
  });

  it("rejects invalid ports", () => {
    expect(() =>
      getMySqlConnectionConfig({ ...validEnvironment, MYSQL_PORT: "70000" }),
    ).toThrow();
  });

  it("uses an explicit server-only MySQL configuration", () => {
    expect(getMySqlConnectionConfig(validEnvironment)).toEqual({
      host: "127.0.0.1",
      port: 3306,
      database: "jtphyqur_zaban_db",
      user: "jtphyqur_zaban_db",
      password: "test-only-password",
    });
  });

  it("uses bounded shared-hosting pool limits and UTC client conversion", () => {
    expect(getMySqlPoolOptions(validEnvironment)).toMatchObject({
      connectionLimit: 3,
      maxIdle: 3,
      idleTimeout: 60_000,
      connectTimeout: 10_000,
      queueLimit: 20,
      timezone: "Z",
    });
  });
});
