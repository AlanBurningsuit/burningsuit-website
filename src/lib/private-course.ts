// What the three private course pages (Power BI fundamentals, DAX fundamentals, DAX deep dive) derive the same way:
// the price copy (only when SHOW_TRAINING_PRICES=true), the meta description and the Course JSON-LD.
import { courseNode } from "./schema";
import { loadTrainingPrices, trainingPriceCopy } from "./training-prices.mjs";

export function privateCourse(site: URL, pathname: string, course: { name: string; summary: string; workload: string }) {
  // Priced, each page's price item names both delivery methods, so its "On site or online" fact is omitted.
  const priced = trainingPriceCopy(loadTrainingPrices());
  return {
    priced,
    description: `${course.summary}${priced ? "" : " Price on request."}`,
    // Delivery stays "On site or online" in both variants, and every private course takes up to 8 people.
    schema: [courseNode({ siteUrl: site.href, pageUrl: new URL(pathname, site).href, name: course.name, description: course.summary, modes: ["Onsite", "Online"], workload: course.workload, maxPeople: 8 })],
  };
}
