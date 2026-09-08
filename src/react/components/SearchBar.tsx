export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <input
      type="search"
      className="fnv-search"
      placeholder="Search by name, version, or license"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Search components"
    />
  );
}
