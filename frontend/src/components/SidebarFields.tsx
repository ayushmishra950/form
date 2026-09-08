import type { FieldType } from '../types/form.types';
import { FIELD_TYPE_META } from '../types/form.types';
import { PlusIcon } from './Icons';

interface SidebarFieldsProps {
  onAddField: (type: FieldType) => void;
}

/**
 * Left rail of the builder: the palette of field types that can be
 * appended to the canvas.
 */
export function SidebarFields({ onAddField }: SidebarFieldsProps) {
  return (
    <aside className="flex h-full w-full flex-col border-r bg-[color:var(--surface-raised)] lg:w-72 xl:w-80">
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight">Field library</h2>
        <p className="text-muted mt-1 text-xs leading-relaxed">
          Add a question to the canvas, then fine-tune it in the inspector.
        </p>
      </div>

      <div className="scroll-slim flex-1 space-y-1.5 overflow-y-auto p-3">
        {FIELD_TYPE_META.map((meta) => (
          <button
            key={meta.type}
            type="button"
            onClick={() => onAddField(meta.type)}
            className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-[color:var(--hairline)] hover:bg-[color:var(--surface-sunken)]"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[color:var(--surface-sunken)] text-[10px] font-semibold uppercase tracking-wider text-muted transition-colors group-hover:bg-brand-500/12 group-hover:text-brand-600 dark:group-hover:text-brand-300">
              {meta.type.slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">{meta.label}</span>
              <span className="text-muted block truncate text-[11px]">
                {meta.description}
              </span>
            </span>
            <PlusIcon
              width={15}
              height={15}
              className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
            />
          </button>
        ))}
      </div>
    </aside>
  );
}
