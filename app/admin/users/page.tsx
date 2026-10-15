import { getProfile } from "@/lib/actions/profile";
import { getMessages, resolveInterfaceLanguage } from "@/lib/i18n/config";
import { adminRead, type UserList as List } from "@/lib/admin/data";
import { accountStatuses, userFiltersSchema } from "@/lib/admin/model";
import { UserList, Pagination } from "@/components/admin/user-list";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const language = resolveInterfaceLanguage(await getProfile());
  const messages = getMessages(language);
  const m = messages.admin;
  const parsed = userFiltersSchema.safeParse(await searchParams);
  if (!parsed.success) return <p role="alert">{m.invalid}</p>;
  const { search, status, page } = parsed.data;
  const data = await adminRead<List>("admin_users", {
    p_search: search,
    p_status: status,
    p_page: page,
  });
  return (
    <section className="space-y-5">
      <h2 className="type-section">{m.users}</h2>
      <form className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-2 text-sm">
          {m.search}
          <Input
            className="mt-2"
            name="search"
            defaultValue={search}
            maxLength={100}
          />
        </label>
        <label className="space-y-2 text-sm">
          {m.status}
          <select
            className="mt-2 h-11 w-full rounded-lg border bg-background px-3"
            name="status"
            defaultValue={status}
          >
            <option value="">{m.all}</option>
            {accountStatuses.map((s) => (
              <option key={s} value={s}>
                {m[s]}
              </option>
            ))}
          </select>
        </label>
        <Button>{m.filter}</Button>
      </form>
      {data ? (
        <>
          <UserList
            users={data.users}
            messages={messages}
            language={language}
          />
          <Pagination
            page={page}
            total={data.total}
            base={`/admin/users?${new URLSearchParams({ search, status })}`}
            messages={messages}
            language={language}
          />
        </>
      ) : (
        <p role="alert">{m.loadFailed}</p>
      )}
    </section>
  );
}
