// Both collections share the import-free authoring kit. No browser JavaScript.
import Chapter from "./Chapter.astro";
import Snapshot from "./Snapshot.astro";
import Offer from "./Offer.astro";
import Aside from "./Aside.astro";
import Exhibit from "./Exhibit.astro";
import Section from "./case-study/Section.astro";
import Teaching from "./case-study/Teaching.astro";
import Return from "./case-study/Return.astro";
import Code from "./case-study/Code.astro";
import EssayFigure from "./EssayFigure.astro";

export const components = { Chapter, Snapshot, Offer, Aside, Exhibit, EssayFigure, Section, Teaching, Return, pre: Code };
