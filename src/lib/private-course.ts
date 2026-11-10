// What the three private course pages (Power BI fundamentals, DAX fundamentals, DAX deep dive) derive the same way:
// the meta description and the Course JSON-LD. Each page takes its price item from src/lib/training-prices.mjs.
import { courseNode } from "./schema";

export function privateCourse(site: URL, pathname: string, course: { name: string; summary: string; workload: string }) {
  return {
    description: course.summary,
    // Delivery is on site or online, and every private course takes up to 8 people.
    schema: [courseNode({ siteUrl: site.href, pageUrl: new URL(pathname, site).href, name: course.name, description: course.summary, modes: ["Onsite", "Online"], workload: course.workload, maxPeople: 8 })],
  };
}
