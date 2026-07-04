"use client";

import { useState } from "react";
import Link from "next/link";
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
                    className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-gold text-gold text-lg overflow-hidden"
                    aria-hidden
                  >
                    <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isOpen ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}>
                      +
                    </span>
                    <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`}>
                      −
                    </span>
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                     isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pb-4">
                      <p className="text-sm leading-relaxed text-muted">{item.body}</p>
                      <Link
                        href="/courses"
                        className="mt-4 inline-flex items-center text-sm font-semibold text-gold hover:underline"
                      >
                        Start learning →
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
