"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchStudentOptionsAction } from "@/app/admin/students/actions";

type StudentOption = { id: string; name: string | null; email: string };

const studentLabel = (student: StudentOption) => student.name?.trim() || student.email;

/**
 * A searchable student picker for GET filter forms: type part of a name,
 * e-mail or registration number and pick from at most 20 matches. Submits
 * the chosen student's id under `name`; empty means "all students".
 */
export function StudentSearchCombobox({
  id,
  name,
  selected,
  className,
}: {
  id: string;
  name: string;
  selected: StudentOption | null;
  className?: string;
}) {
  const listboxId = useId();
  const [value, setValue] = useState<StudentOption | null>(selected);
  const [query, setQuery] = useState(selected ? studentLabel(selected) : "");
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const current = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const results = await searchStudentOptionsAction(value && query === studentLabel(value) ? "" : query);
        if (current === requestId.current) {
          setOptions(results);
          setActive(-1);
        }
      } catch {
        if (current === requestId.current) setOptions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open, value]);

  function choose(option: StudentOption | null) {
    setValue(option);
    setQuery(option ? studentLabel(option) : "");
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && active >= 0 && options[active]) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value?.id ?? ""} />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && active >= 0 ? `${listboxId}-${active}` : undefined}
        autoComplete="off"
        placeholder="All students (type to search)"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (value && event.target.value !== studentLabel(value)) setValue(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        className={className}
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full min-w-64 overflow-auto rounded-md border border-border bg-surface py-1 text-sm shadow-lg"
        >
          <li
            role="option"
            aria-selected={value === null}
            className="cursor-pointer px-3 py-2 text-muted hover:bg-accent-muted/50"
            onMouseDown={(event) => {
              event.preventDefault();
              choose(null);
            }}
          >
            All students
          </li>
          {options.map((option, index) => (
            <li
              key={option.id}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={value?.id === option.id}
              className={`cursor-pointer px-3 py-2 hover:bg-accent-muted/50 ${index === active ? "bg-accent-muted/50" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
            >
              <span className="block text-foreground">{studentLabel(option)}</span>
              {option.name?.trim() && <span className="block text-xs text-muted">{option.email}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
