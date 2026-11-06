/** Explicit development-only gate. Production and test environments remain Supabase. */
export function isMySqlPreviewEnabled(
  environment: Partial<Record<"NODE_ENV" | "ZABAN_MYSQL_PREVIEW" | "ZABAN_BETTER_AUTH_DEV_ROUTE", string>> = process.env,
): boolean {
  return environment.NODE_ENV === "development" &&
    environment.ZABAN_MYSQL_PREVIEW === "enabled" &&
    environment.ZABAN_BETTER_AUTH_DEV_ROUTE === "enabled";
}
