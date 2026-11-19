// Both collections share the import-free authoring kit. No browser JavaScript.
import Chapter from "./Chapter.astro";
import Section from "./case-study/Section.astro";
import Teaching from "./case-study/Teaching.astro";
import Evidence from "./case-study/Evidence.astro";
import Code from "./case-study/Code.astro";
import EssayFigure from "./EssayFigure.astro";
import Screenshot from "./Screenshot.astro";
import UpdateNote from "./UpdateNote.astro";

export const components = { Chapter, EssayFigure, Screenshot, UpdateNote, Section, Teaching, Evidence, pre: Code };
