import { SearchIcon } from '../Icons';
import { cn } from '../../lib/utils';

interface SearchBarProps<TFilter extends string> {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  filters: ReadonlyArray<{ value: TFilter; label: string }>;
  activeFilter: TFilter;
  onFilterChange: (value: TFilter) => void;
}

/** Search box plus a segmented status filter, shared by both admin tables. */
export function SearchBar<TFilter extends string>({
  value,
  onChange,
  placeholder,
  filters,
  activeFilter,
  onFilterChange,
}: SearchBarProps<TFilter>) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1">
        <SearchIcon
          width={16}
          height={16}
          className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-lg border bg-[color:var(--surface-raised)] py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
        />
      </div>

      <div className="flex items-center rounded-lg border bg-[color:var(--surface-raised)] p-0.5">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onFilterChange(filter.value)}
            aria-pressed={activeFilter === filter.value}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activeFilter === filter.value
                ? 'bg-[color:var(--surface-sunken)] text-[color:var(--ink)]'
                : 'text-muted hover:text-[color:var(--ink)]',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
