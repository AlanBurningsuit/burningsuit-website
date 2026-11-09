// @ts-check
/**
 * The two starting courses as Home and Training both introduce them: one copy of the shared wording, so the two
 * pages cannot drift apart. Each page still writes its own facts list (their price wording differs by approval)
 * and its own links, through src/components/CourseEntry.astro.
 */
export const STARTING_COURSES = Object.freeze({
  fundamentals: Object.freeze({
    id: "fundamentals-title",
    fit: "New to Power BI?",
    title: "Power BI fundamentals",
    href: "/training/power-bi-fundamentals/",
    summary: "Learn to build an interactive report, prepare the data behind it and share it with the people who need it.",
    prereq: "No Power BI experience needed.",
  }),
  agents101: Object.freeze({
    id: "agents-101-title",
    fit: "Want to be ready for where Power BI is going?",
    title: "Power BI with AI agents 101",
    href: "/training/power-bi-with-ai-agents-101/",
    summary: "In one morning, you get an AI agent to explain a report you haven't seen before and write notes on its calculations. Then you have it build a new calculation and check its answers yourself.",
    prereq: "You've built a report in Power BI Desktop, even a simple one. No coding or AI experience needed.",
    mode: "Half a day, live online",
  }),
});
