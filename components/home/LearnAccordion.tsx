"use client";

import { useState } from "react";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { SplitSectionTitle } from "@/components/site/SplitSectionTitle";

const items = [
  {
    title: "Quran Recitation (Nazira)",
    body: "Build fluent reading from the Arabic script with correct pronunciation and steady progress.",
  },
  {
    title: "Tajweed & Memorization",
    body: "Apply rules of Tajweed and structured Hifz plans with regular revision and teacher feedback.",
  },
  {
    title: "Arabic & Islamic Studies",
    body: "Understand the language of the Quran and core Islamic knowledge—Aqeedah, Fiqh, and Seerah.",
  },
  {
    title: "Group Classes",
    body: "Join live online group sessions with fellow students—structured lessons, teacher guidance, and a supportive learning community.",
  },
];

export function LearnAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="text-center">
          <SplitSectionTitle muted="What You'll" accent="Learn" />
        </div>
        <ul className="mt-8 divide-y divide-border">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <li key={item.title}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 py-4 text-left"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-foreground">{item.title}</span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-gold text-gold transition-transform ${isOpen ? "rotate-45" : ""}`}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <>
                    <p className="pb-4 text-sm leading-relaxed text-muted">{item.body}</p>
                    <TrackedLink
                      href="/courses"
                      eventName="View Courses"
                      pageName="/"
                      className="mt-4 inline-flex items-center text-sm font-semibold text-gold hover:underline"
                    >
                      Start learning →
                    </TrackedLink>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
