"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CountryFlag } from "@/components/profile/CountryFlag";
import {
  PROFILE_COUNTRIES,
  getProfileCountryOrDefault,
  type ProfileCountryCode,
} from "@/services/countries";
import { inputClassName } from "@/utils/form";

type ProfileCountrySelectProps = {
  id: string;
  name: string;
  value: ProfileCountryCode;
  onChange: (code: ProfileCountryCode) => void;
  onBlur?: () => void;
  hasError?: boolean;
  errorId?: string;
  required?: boolean;
};

export function ProfileCountrySelect({
  id,
  name,
  value,
  onChange,
  onBlur,
  hasError = false,
  errorId,
  required = false,
}: ProfileCountrySelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = getProfileCountryOrDefault(value);

  const filteredCountries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return PROFILE_COUNTRIES;
    return PROFILE_COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(normalized) ||
        country.code.toLowerCase().startsWith(normalized),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
        onBlur?.();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onBlur]);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    }
  }, [open]);

  function selectCountry(code: ProfileCountryCode) {
    onChange(code);
    setOpen(false);
    setQuery("");
    onBlur?.();
  }

  const triggerClass = hasError
    ? `${inputClassName} flex items-center justify-between gap-2 border-red-500 focus:border-red-500 focus:ring-red-500`
    : `${inputClassName} flex items-center justify-between gap-2`;

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError && errorId ? errorId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClass}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CountryFlag code={selected.code} size={20} />
          <span className="truncate text-foreground">{selected.name}</span>
        </span>
        <span className="shrink-0 text-xs text-muted" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          <div className="border-b border-border p-2">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              aria-label="Search countries"
            />
          </div>
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={id}
            className="max-h-60 overflow-y-auto py-1"
          >
            {filteredCountries.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">No countries found.</li>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = country.code === value;
                return (
                  <li key={country.code} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => selectCountry(country.code as ProfileCountryCode)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent-muted/50 ${
                        isSelected ? "bg-accent-muted/40 font-medium text-foreground" : "text-foreground"
                      }`}
                    >
                      <CountryFlag code={country.code} size={20} />
                      <span className="truncate">{country.name}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
