import { useState } from "react";
import type { Snippet } from "../types";
import Input from "./ui/Input";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import Skeleton from "./ui/Skeleton";
import { useDebounce } from "../hooks/useDebounce";

interface SnippetListProps {
  snippets: Snippet[];
  onEdit: (snippet: Snippet) => void;
  onDelete: (id: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  selectedFolder: string;
  loading?: boolean;
  onAdd?: () => void;
}

export default function SnippetList({
  snippets,
  onEdit,
  onDelete,
  searchInputRef,
  selectedFolder,
  loading,
  onAdd,
}: SnippetListProps) {
  const [search, setSearch] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 150);

  const filtered = snippets.filter(
    (s) =>
      s.label.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.shortcut.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  return (
    <div className="flex-1 p-6 overflow-y-auto overflow-x-hidden min-w-0">
      <div className="mb-6 relative">
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search snippets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors text-lg leading-none"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-card">
              <Skeleton className="h-5 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/4 mb-3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-center">
          <svg className="w-16 h-16 text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-primary mb-1">
            {debouncedSearch ? "No snippets found" : "No snippets yet"}
          </h3>
          <p className="text-sm text-secondary">
            {debouncedSearch
              ? "Try a different search term."
              : "Create your first snippet to get started."}
          </p>
          {!debouncedSearch && onAdd && (
            <Button onClick={onAdd} className="mt-4">
              + New Snippet
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((snippet, i) => (
            <div
              key={snippet.id}
              className="bg-card rounded-xl p-4 flex items-start gap-4 shadow-card animate-fade-in-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-primary font-medium truncate">
                  {snippet.label}
                </h3>
                <Badge variant="accent">{snippet.shortcut}</Badge>
                {snippet.folder && selectedFolder !== snippet.folder && (
                  <Badge variant="folder" className="ml-1.5">{snippet.folder}</Badge>
                )}
                <p className="mt-2 text-secondary text-sm truncate">
                  {snippet.expansion}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => onEdit(snippet)}>
                  Edit
                </Button>
                {confirmingId === snippet.id ? (
                  <>
                    <Button variant="danger" size="sm" onClick={() => { onDelete(snippet.id); setConfirmingId(null); }}>
                      Confirm?
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setConfirmingId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="danger-ghost" size="sm" onClick={() => setConfirmingId(snippet.id)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
