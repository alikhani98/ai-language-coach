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
        title={messages.coach.notebookTitle}
      />

      {notebook.categories.length ? (
        <div className="flex flex-wrap gap-2">
          <a
            href="/mistakes"
            aria-current={!params.category ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:border-primary/50 ${!params.category ? "border-primary/30 bg-primary/10 text-primary" : "bg-card text-muted-foreground"}`}
          >
            {messages.mistakes.all}
          </a>
          {notebook.categories.map((category) => (
            <a
              key={category}
              href={`/mistakes?category=${encodeURIComponent(category)}`}
              aria-current={params.category === category ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:border-primary/50 ${params.category === category ? "border-primary/30 bg-primary/10 text-primary" : "bg-card text-muted-foreground"}`}
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
