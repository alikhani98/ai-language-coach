import { requireProfile } from "@/lib/actions/profile";
import { getMistakeNotebook } from "@/lib/actions/mistakes";
import { MistakeNotebook } from "@/components/mistake-notebook";
import { getMessages } from "@/lib/i18n/config";
import { PageHeader } from "@/components/ui/page-header";

type MistakesPageProps = {
  searchParams: Promise<{
    category?: string;
  }>;
};

export default async function MistakesPage({ searchParams }: MistakesPageProps) {
  const profile = await requireProfile();
  const params = await searchParams;
  const notebook = await getMistakeNotebook(params.category);
  const messages = getMessages(profile.interface_language);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={messages.mistakes.eyebrow}
        title={messages.mistakes.heading}
        description={messages.mistakes.body}
      />

      {notebook.categories.length ? (
        <div className="flex flex-wrap gap-2">
          <a
            href="/mistakes"
            className="rounded-xl border bg-background px-3 py-2 text-sm"
          >
            {messages.mistakes.all}
          </a>
          {notebook.categories.map((category) => (
            <a
              key={category}
              href={`/mistakes?category=${encodeURIComponent(category)}`}
              className="rounded-xl border bg-background px-3 py-2 text-sm"
            >
              {category}
            </a>
          ))}
        </div>
      ) : null}

      <MistakeNotebook
        mistakes={notebook.mistakes}
        groups={notebook.groups}
        messages={messages}
      />
    </section>
  );
}
