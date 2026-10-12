import { requireProfile } from "@/lib/actions/profile";
import { getMistakeNotebook } from "@/lib/actions/mistakes";
import { MistakeNotebook } from "@/components/mistake-notebook";

type MistakesPageProps = {
  searchParams: Promise<{
    category?: string;
  }>;
};

export default async function MistakesPage({ searchParams }: MistakesPageProps) {
  await requireProfile();
  const params = await searchParams;
  const notebook = await getMistakeNotebook(params.category);

  return (
    <section className="space-y-6">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Mistake notebook
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Review corrections from real practice.
        </h1>
        <p className="text-muted-foreground">
          These entries come from saved conversation corrections. Treat them as
          useful feedback, not a full assessment of your English.
        </p>
      </div>

      {notebook.categories.length ? (
        <div className="flex flex-wrap gap-2">
          <a
            href="/mistakes"
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            All
          </a>
          {notebook.categories.map((category) => (
            <a
              key={category}
              href={`/mistakes?category=${encodeURIComponent(category)}`}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {category}
            </a>
          ))}
        </div>
      ) : null}

      <MistakeNotebook
        mistakes={notebook.mistakes}
        groups={notebook.groups}
      />
    </section>
  );
}
