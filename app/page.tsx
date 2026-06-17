import { HomeAnnouncements } from "@/components/home/HomeAnnouncements";
import { ExperienceBanner } from "@/components/home/ExperienceBanner";
import { HomeFatwa } from "@/components/home/HomeFatwa";
import { FeatureCards } from "@/components/home/FeatureCards";
import { FeaturedBlogs } from "@/components/home/FeaturedBlogs";
import { FeaturedCourses } from "@/components/home/FeaturedCourses";
import { FeaturedResources } from "@/components/home/FeaturedResources";
import { FeaturedBooks } from "@/components/home/FeaturedBooks";
import { HomeAbout } from "@/components/home/HomeAbout";
import { HomeDailyInspiration } from "@/components/home/HomeDailyInspiration";
import { HeroWave } from "@/components/home/HeroWave";
import { HomeHero } from "@/components/home/HomeHero";
import { LearnAccordion } from "@/components/home/LearnAccordion";
import { StudentTestimonials } from "@/components/home/StudentTestimonials";
import { getFeaturedHomepageCourses } from "@/lib/courses";
import { getHomepageDailyInspiration } from "@/lib/daily-inspiration";

export default async function HomePage() {
  const [featuredCourses, dailyInspiration] = await Promise.all([
    getFeaturedHomepageCourses(),
    getHomepageDailyInspiration(),
  ]);

  return (
    <>
      <HomeHero />
      <HeroWave />
      <FeatureCards />
      <HomeDailyInspiration inspiration={dailyInspiration} />
      <FeaturedCourses courses={featuredCourses} />
      <HomeAnnouncements />
      <FeaturedBlogs />
      <FeaturedResources />
      <FeaturedBooks />
      <HomeFatwa />
      <HomeAbout />
      <ExperienceBanner />
      <StudentTestimonials />
      <LearnAccordion />
    </>
  );
}
