// Optional SQL integration runner. Supply an externally installed PGlite module;
// no production/development dependency or project lockfile change is required.
// Usage: node scripts/test-learning-memory-sql.mjs <absolute-path-to-pglite>
import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";

const runtime = process.argv[2];
if (!runtime) throw new Error("Supply a path to an external @electric-sql/pglite installation; see docs/PHASE_8_1_MEMORY.md.");
const { PGlite } = createRequire(import.meta.url)(runtime);
const db = new PGlite();
try {
  // Emulate Supabase's auth contract in an in-memory database only.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz,raw_app_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `);
  for (const file of (await readdir("supabase/migrations")).filter((file) => file.endsWith(".sql")).sort()) {
    const sql = (await readFile(`supabase/migrations/${file}`, "utf8"))
      // gen_random_uuid is built into this PostgreSQL runtime; pgcrypto isn't bundled.
      .replace('create extension if not exists "pgcrypto";', "");
    if (file === "202610160001_admin_approval.sql") {
      await db.exec(`
        insert into auth.users(id) values ('80000000-0000-4000-8000-000000000001'),('80000000-0000-4000-8000-000000000002');
        insert into public.users_profile(user_id,level,goal) values ('80000000-0000-4000-8000-000000000001','a2_elementary','work');
      `);
    }
    await db.exec(sql);
    if (file === "202610160001_admin_approval.sql") {
      await db.exec(`
        do $$ begin
          assert (select count(*)=2 from public.users_profile where user_id in ('80000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002') and status='active'), 'All legacy Auth accounts retain access';
          assert (select level='a2_elementary' from public.users_profile where user_id='80000000-0000-4000-8000-000000000001'), 'Legacy profile values preserved';
        end $$;
        delete from auth.users where id in ('80000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002');
      `);
    }
  }
  await db.exec(await readFile("supabase/tests/learning_memory.sql", "utf8"));
  await db.exec(await readFile("supabase/tests/admin_approval.sql", "utf8"));
  console.log("Admin approval SQL integration passed.");
  console.log("Learning memory SQL integration: migrations, aggregation, deduplication, timezone windows, privacy, owner isolation, and anonymous denial passed.");
} catch (error) {
  console.error(error.message);
  if (error.where) console.error(error.where);
  if (error.position && error.query) {
    const position = Number(error.position);
    console.error(error.query.slice(Math.max(0, position - 100), position + 100));
  }
  await db.exec("rollback").catch(() => {});
  process.exitCode = 1;
} finally {
  await db.close();
}
