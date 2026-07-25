import { BRAND_CONFIG } from "@/config/brand";

/**
 * Organization Schema generator (EducationalOrganization)
 */
export function getOrganizationSchema() {
  const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");
  const logoUrl = BRAND_CONFIG.assets.logoUrl.startsWith("http")
    ? BRAND_CONFIG.assets.logoUrl
    : `${baseUrl}${BRAND_CONFIG.assets.logoUrl}`;

  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: BRAND_CONFIG.name,
    alternateName: BRAND_CONFIG.shortName,
    url: baseUrl,
    logo: logoUrl,
    description: BRAND_CONFIG.seo.defaultDescription,
    address: {
      "@type": "PostalAddress",
      streetAddress: BRAND_CONFIG.contact.address,
      addressCountry: "IN",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: BRAND_CONFIG.contact.phone,
      contactType: "customer service",
      email: BRAND_CONFIG.contact.email,
      availableLanguage: ["English", "Urdu", "Arabic"],
    },
    sameAs: Object.values(BRAND_CONFIG.social).filter(Boolean),
  };
}

/**
 * Course Schema generator
 */
export interface CourseSchemaParams {
  id: string;
  title: string;
  description: string;
  category?: string;
  level?: string;
  duration?: string;
  priceInrPaise?: number;
  monthlyFeeInrPaise?: number;
  imageUrl?: string;
  teacherName?: string;
}

export function getCourseSchema(course: CourseSchemaParams) {
  const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");
  const courseUrl = `${baseUrl}/courses/${course.id}`;
  const price = (course.priceInrPaise ?? course.monthlyFeeInrPaise ?? 0) / 100;

  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    provider: {
      "@type": "EducationalOrganization",
      name: BRAND_CONFIG.name,
      sameAs: baseUrl,
    },
    url: courseUrl,
    courseCode: course.id,
    educationalLevel: course.level || "All Levels",
    about: course.category || "Islamic Studies",
    timeRequired: course.duration || undefined,
    ...(course.imageUrl && { image: course.imageUrl }),
    ...(course.teacherName && {
      instructor: {
        "@type": "Person",
        name: course.teacherName,
      },
    }),
    offers: {
      "@type": "Offer",
      category: "Paid",
      price: price.toString(),
      priceCurrency: "INR",
      url: courseUrl,
      availability: "https://schema.org/InStock",
    },
  };
}

/**
 * Blog Posting / Article Schema generator
 */
export interface BlogPostingSchemaParams {
  id: string;
  title: string;
  excerpt?: string | null;
  body: string;
  authorName?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  imageUrl?: string;
}

export function getBlogPostingSchema(post: BlogPostingSchemaParams) {
  const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");
  const postUrl = `${baseUrl}/blog/${post.id}`;
  const publishDate = new Date(post.createdAt).toISOString();
  const modifiedDate = post.updatedAt ? new Date(post.updatedAt).toISOString() : publishDate;
  const description = post.excerpt || post.body.substring(0, 160).replace(/[#*`]/g, "");

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: description,
    url: postUrl,
    datePublished: publishDate,
    dateModified: modifiedDate,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
    author: {
      "@type": "Person",
      name: post.authorName || BRAND_CONFIG.name,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND_CONFIG.name,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}${BRAND_CONFIG.assets.logoUrl}`,
      },
    },
    ...(post.imageUrl && { image: post.imageUrl }),
  };
}

/**
 * Book / Product Schema generator
 */
export interface BookSchemaParams {
  id: string;
  title: string;
  author: string;
  description: string;
  priceInrPaise: number;
  status?: string;
  imagePath?: string | null;
}

export function getBookSchema(book: BookSchemaParams) {
  const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");
  const bookUrl = `${baseUrl}/bookstore/${book.id}`;
  const price = (book.priceInrPaise || 0) / 100;
  const inStock = book.status !== "OUT_OF_STOCK";

  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: {
      "@type": "Person",
      name: book.author,
    },
    description: book.description,
    url: bookUrl,
    ...(book.imagePath && {
      image: book.imagePath.startsWith("http") ? book.imagePath : `${baseUrl}${book.imagePath}`,
    }),
    offers: {
      "@type": "Offer",
      price: price.toString(),
      priceCurrency: "INR",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: bookUrl,
    },
  };
}

/**
 * FAQPage / Fatwa Schema generator
 */
export interface FatwaSchemaParams {
  id: string;
  title: string;
  question: string;
  answer: string;
  category?: string;
}

export function getFatwaSchema(fatwa: FatwaSchemaParams) {
  const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");
  const fatwaUrl = `${baseUrl}/fatwa/${fatwa.id}`;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: fatwa.title,
        text: fatwa.question,
        url: fatwaUrl,
        acceptedAnswer: {
          "@type": "Answer",
          text: fatwa.answer,
        },
      },
    ],
  };
}

/**
 * BreadcrumbList Schema generator
 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
  const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url.startsWith("/") ? "" : "/"}${item.url}`,
    })),
  };
}
