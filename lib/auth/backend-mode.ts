/** MySQL is explicitly opted into; Supabase remains the default until cutover. */
export function isMySqlPreviewEnabled(
  environment: Partial<Record<"NODE_ENV" | "ZABAN_MYSQL_PREVIEW" | "ZABAN_BETTER_AUTH_DEV_ROUTE" | "ZABAN_DATA_BACKEND" | "ZABAN_CUTOVER_APPROVED", string>> = process.env,
): boolean {
  return (environment.NODE_ENV === "development" &&
    environment.ZABAN_MYSQL_PREVIEW === "enabled" &&
    environment.ZABAN_BETTER_AUTH_DEV_ROUTE === "enabled") ||
    (environment.NODE_ENV === "production" &&
    environment.ZABAN_DATA_BACKEND === "mysql" &&
    environment.ZABAN_CUTOVER_APPROVED === "yes");
}
