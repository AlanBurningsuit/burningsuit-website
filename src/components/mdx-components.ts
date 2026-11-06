// Both collections share the import-free authoring kit. No browser JavaScript.
import Chapter from "./Chapter.astro";
import Section from "./case-study/Section.astro";
import Teaching from "./case-study/Teaching.astro";
import Return from "./case-study/Return.astro";
import Code from "./case-study/Code.astro";
import EssayFigure from "./EssayFigure.astro";

export const components = { Chapter, EssayFigure, Section, Teaching, Return, pre: Code };
