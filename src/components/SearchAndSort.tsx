"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SortOption = { value: string; label: string };

export default function SearchAndSort({
  placeholder,
  sortOptions,
}: {
  placeholder: string;
  sortOptions?: SortOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("q", q), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {sortOptions && (
        <div className="sort-control">
          <label>Sortera:</label>
          <select
            defaultValue={searchParams.get("sort") ?? sortOptions[0]?.value}
            onChange={(e) => updateParam("sort", e.target.value)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
