import { Search } from "lucide-react";
import { cn } from "../../lib/cn";

export function SearchInput({
  value,
  onChange,
  placeholder,
  id,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        size={14}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted"
      />
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm text-fg placeholder:text-fg-muted focus:border-accent/50 focus:outline-none"
      />
    </div>
  );
}
