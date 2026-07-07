export function resolveHomepageFeaturedUpdate(options: {
  isEligible: boolean;
  requestFeatured: boolean;
  currentlyFeatured: boolean;
  currentFeaturedAt: Date | null;
  featuredCount: number;
  maxFeatured: number;
  resourceLabel: string;
}): { featuredOnHomepage: boolean; featuredAt: Date | null } | { error: string } {
  if (!options.isEligible || !options.requestFeatured) {
    return { featuredOnHomepage: false, featuredAt: null };
  }

  if (options.currentlyFeatured) {
    return {
      featuredOnHomepage: true,
      featuredAt: options.currentFeaturedAt ?? new Date(),
    };
  }

  if (options.featuredCount >= options.maxFeatured) {
    return {
      error: `The homepage already has ${options.maxFeatured} featured ${options.resourceLabel}. Remove one before adding another.`,
    };
  }

  return { featuredOnHomepage: true, featuredAt: new Date() };
}
