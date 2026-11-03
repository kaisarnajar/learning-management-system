import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BRAND_CONFIG } from "@/config/brand";
import { JsonLd } from "@/components/site/JsonLd";
import { Section } from "@/components/site/Section";
import { getBreadcrumbSchema } from "@/services/seo-schema";
import { getLibraryItemById } from "@/services/library";
import { isHttpUrl } from "@/utils/http-url";

type LibraryItemPageProps = {
  params: Promise<{ id: string }>;
};

const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");

async function getPublishedItem(id: string) {
  const item = await getLibraryItemById(id);
  return item?.published ? item : null;
}

export async function generateMetadata({ params }: LibraryItemPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getPublishedItem(id);
  if (!item) return { title: "Library item not found" };

  const url = `${baseUrl}/library/${item.id}`;
  const description = `${item.title} by ${item.author} — ${item.topic} (${item.level}, ${item.language}) in the ${BRAND_CONFIG.name} digital library.`;

  return {
    title: `${item.title} by ${item.author}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${item.title} | ${BRAND_CONFIG.name} Library`,
      description,
      url,
      siteName: BRAND_CONFIG.name,
      type: "website",
      images: [{ url: BRAND_CONFIG.seo.openGraphImage, alt: item.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description,
      images: [BRAND_CONFIG.seo.openGraphImage],
    },
  };
}

export default async function LibraryItemPage({ params }: LibraryItemPageProps) {
  const { id } = await params;
  const item = await getPublishedItem(id);
  if (!item) notFound();

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Library", url: "/library" },
    { name: item.title, url: `/library/${item.id}` },
  ]);

  return (
    <Section>
      <JsonLd data={[breadcrumbSchema]} />
      <p className="text-sm text-muted">
        <Link href="/library" className="font-medium text-primary hover:underline">
          ← Digital Library
        </Link>
      </p>

      <article className="mx-auto mt-6 grid max-w-4xl gap-8 md:grid-cols-[minmax(0,16rem)_1fr]">
        {item.imagePath && (
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-accent-muted/30">
            <Image
              src={item.imagePath}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 16rem"
              priority
            />
          </div>
        )}

        <div className={item.imagePath ? "" : "md:col-span-2"}>
          <span className="inline-flex rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-semibold text-primary">
            {item.topic}
          </span>
          <h1 className="mt-3 font-serif text-2xl font-bold text-foreground sm:text-3xl">{item.title}</h1>
          <p className="mt-1 text-base text-muted">by {item.author}</p>

          <dl className="mt-6 grid max-w-sm grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Level</dt>
              <dd className="font-medium text-foreground">{item.level}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Language</dt>
              <dd className="font-medium text-foreground">{item.language}</dd>
            </div>
          </dl>

          {isHttpUrl(item.pdfUrl) ? (
            <Link
              href={item.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              View / download PDF
            </Link>
          ) : (
            <p className="mt-8 rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-sm text-muted">
              The PDF for this item is not available yet.
            </p>
          )}
        </div>
      </article>
    </Section>
  );
}
