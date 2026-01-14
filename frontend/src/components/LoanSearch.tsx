import React, { useEffect, useMemo, useState } from 'react';

interface LoanSearchProps<T> {
  items: T[];
  fields: (keyof T)[];
  placeholder?: string;
  onResults: (results: T[]) => void;
  debounceMs?: number;
}

export const LoanSearch = <T extends Record<string, any>>({ items, fields, placeholder = 'Search loans...', onResults, debounceMs = 150 }: LoanSearchProps<T>) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.trim().toLowerCase();
      if (!q) {
        onResults(items);
        return;
      }
      const filtered = items.filter(item => {
        return fields.some(f => {
          const val = String(item[f] ?? '').toLowerCase();
          return val.includes(q);
        });
      });
      onResults(filtered);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [query, items, fields, onResults, debounceMs]);

  return (
    <div className="w-full">
      <input
        className="w-full border rounded px-3 py-2"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Loan search"
      />
    </div>
  );
};

export default LoanSearch;
