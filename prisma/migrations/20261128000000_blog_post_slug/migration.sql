-- Title-based blog URLs: /blog/<slug> instead of /blog/<id>.
--
-- 1. Nullable column (expand step: no SET NOT NULL, per the migration safety
--    rules). Posts saved by older code get a NULL slug and are served at
--    /blog/<id> until they get one.
-- 2. Backfill every existing post from its title, close to what
--    utils/slug.ts slugifyTitle() makes for new posts: lower case,
--    apostrophes dropped, every run of ASCII punctuation, whitespace or
--    Arabic-script punctuation becomes one "-", letters in any script are
--    kept, at most 80 characters. (Unlike slugifyTitle(), accents on Latin
--    letters stay: Postgres has no portable way to drop them without the
--    unaccent extension. The slug is stored, so the two never need to agree.)
--    A title with nothing left gives "post". Posts that share a slug get
--    "-1", "-2", ... in creation order, as uniqueSlug() numbers them.
--    Old /blog/<id> links redirect to the new URL in the app.
-- 3. Unique index, the one Prisma names for `slug String? @unique`.

-- 1. Column -----------------------------------------------------------------
ALTER TABLE "BlogPost" ADD COLUMN "slug" TEXT;

-- 2. Backfill ---------------------------------------------------------------
-- The character class lists what is NOT kept: anything other than a-z, 0-9
-- and characters from U+00C0 up (letters of every script), plus the common
-- Arabic/Urdu punctuation and typographic quotes and dashes that sit above
-- U+00C0. It is written without POSIX classes so the result does not depend
-- on the database's locale.
WITH base AS (
  SELECT
    "id",
    "createdAt",
    COALESCE(
      NULLIF(
        TRIM(BOTH '-' FROM LEFT(
          TRIM(BOTH '-' FROM REGEXP_REPLACE(
            REGEXP_REPLACE(LOWER("title"), '[''\u2018\u2019\u02BC]', '', 'g'),
            '([^a-z0-9À-\U0010FFFF]|[،؛؟۔×÷‐-―‘-‟…«»])+',
            '-',
            'g'
          )),
          80
        )),
        ''
      ),
      'post'
    ) AS "base"
  FROM "BlogPost"
  WHERE "slug" IS NULL
),
numbered AS (
  SELECT
    "id",
    "base",
    ROW_NUMBER() OVER (PARTITION BY "base" ORDER BY "createdAt", "id") AS "n"
  FROM base
)
UPDATE "BlogPost" AS p
SET "slug" = CASE WHEN numbered."n" = 1 THEN numbered."base" ELSE numbered."base" || '-' || (numbered."n" - 1) END
FROM numbered
WHERE p."id" = numbered."id";

-- A numbered slug can still equal another title's plain slug ("Ramadan" twice
-- gives "ramadan-1", and a post titled "Ramadan 1" also gives "ramadan-1").
-- Those rare rows, apart from the oldest, take the post id as their suffix
-- instead, so the unique index below always builds.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt", "id") AS "n"
  FROM "BlogPost"
  WHERE "slug" IS NOT NULL
)
UPDATE "BlogPost" AS p
SET "slug" = p."slug" || '-' || p."id"
FROM ranked
WHERE p."id" = ranked."id" AND ranked."n" > 1;

-- 3. Unique index -------------------------------------------------------------
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
