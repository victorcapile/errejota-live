import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { neighborhoods, newsItems, regions } from "./schema";
import { NEWS_FEEDS, type RegionSlug } from "@/lib/constants";
import { normalizeText } from "@/lib/text";

type FeedEntry = {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  description?: unknown;
};

const REGION_KEYWORDS: Array<{ slug: RegionSlug; keywords: string[] }> = [
  { slug: "zona-sul", keywords: ["zona sul"] },
  { slug: "zona-norte", keywords: ["zona norte"] },
  { slug: "zona-oeste", keywords: ["zona oeste"] },
  { slug: "ilhas", keywords: ["ilha do governador", "ilha fundao", "paqueta"] },
  { slug: "centro", keywords: ["centro do rio", "centro historico"] },
];

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function itemId(url: string): string {
  return `news_${createHash("sha1").update(url).digest("hex").slice(0, 16)}`;
}

async function fetchFeed(url: string): Promise<FeedEntry[]> {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "RioEmFoco/0.1 (catálogo de estudo; coleta de títulos de feeds públicos)",
      accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
    htmlEntities: true,
  });
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: FeedEntry | FeedEntry[] } };
    feed?: { entry?: FeedEntry | FeedEntry[] };
  };

  const rssItems = toArray(parsed.rss?.channel?.item);
  if (rssItems.length > 0) {
    return rssItems;
  }

  return toArray(parsed.feed?.entry).map((entry) => {
    const link = entry.link as
      | string
      | { "@_href"?: string }
      | undefined;
    return {
      ...entry,
      link: typeof link === "string" ? link : link?.["@_href"],
    };
  });
}

async function main() {
  console.log("Rio em Foco — coletando manchetes de feeds oficiais...");

  const regionRows = await db
    .select({ id: regions.id, slug: regions.slug })
    .from(regions);
  const regionIdBySlug = new Map(
    regionRows.map((row) => [row.slug as RegionSlug, row.id]),
  );

  const neighborhoodRows = await db
    .select({
      slug: neighborhoods.slug,
      name: neighborhoods.name,
      regionSlug: regions.slug,
    })
    .from(neighborhoods)
    .innerJoin(regions, eq(neighborhoods.regionId, regions.id))
    .orderBy(neighborhoods.name);

  const neighborhoodMatchers = neighborhoodRows
    .map((row) => ({
      slug: row.slug,
      keyword: normalizeText(row.name),
      regionSlug: row.regionSlug as RegionSlug,
    }))
    .filter((row) => row.keyword.length >= 4)
    .sort((a, b) => b.keyword.length - a.keyword.length);

  function matchNeighborhood(title: string): string | null {
    const haystack = ` ${normalizeText(title)} `;
    for (const row of neighborhoodMatchers) {
      if (haystack.includes(` ${row.keyword} `)) {
        return row.slug;
      }
    }
    return null;
  }

  function matchRegion(title: string, fallback: RegionSlug): RegionSlug {
    const haystack = ` ${normalizeText(title)} `;

    for (const row of neighborhoodMatchers) {
      if (haystack.includes(` ${row.keyword} `)) {
        return row.regionSlug;
      }
    }

    for (const group of REGION_KEYWORDS) {
      if (
        group.keywords.some((keyword) =>
          haystack.includes(` ${normalizeText(keyword)} `),
        )
      ) {
        return group.slug;
      }
    }

    return fallback;
  }

  const now = new Date().toISOString();
  let inserted = 0;
  let skipped = 0;

  for (const feed of NEWS_FEEDS) {
    console.log(`- ${feed.publisher} (${feed.url})`);

    let entries: FeedEntry[];
    try {
      entries = await fetchFeed(feed.url);
    } catch (error) {
      console.warn(
        `  falha ao ler o feed: ${error instanceof Error ? error.message : error}`,
      );
      continue;
    }

    for (const entry of entries.slice(0, 30)) {
      const title = cleanText(entry.title);
      const url = typeof entry.link === "string" ? entry.link.trim() : "";
      if (!title || !url || !/^https?:\/\//.test(url)) {
        skipped += 1;
        continue;
      }

      const regionSlug = matchRegion(title, feed.defaultRegion);
      const regionId = regionIdBySlug.get(regionSlug);
      if (!regionId) {
        skipped += 1;
        continue;
      }

      const neighborhoodSlug = matchNeighborhood(title);
      const neighborhoodId = neighborhoodSlug
        ? `neighborhood_${neighborhoodSlug}`
        : null;

      const publishedAt = parseDate(entry.pubDate);

      await db
        .insert(newsItems)
        .values({
          id: itemId(url),
          regionId,
          neighborhoodId,
          kind: "headline",
          title,
          url,
          publisher: feed.publisher,
          feedId: feed.id,
          publishedAt,
          fetchedAt: now,
          isActive: true,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: newsItems.url,
          set: {
            regionId,
            neighborhoodId,
            title,
            publisher: feed.publisher,
            feedId: feed.id,
            publishedAt,
            fetchedAt: now,
            isActive: true,
          },
        });

      inserted += 1;
    }
  }

  console.log(
    `Coleta concluída: ${inserted} manchetes gravadas/atualizadas, ${skipped} ignoradas.`,
  );
}

main().catch((error) => {
  console.error("Falha na coleta de notícias:", error);
  process.exit(1);
});
