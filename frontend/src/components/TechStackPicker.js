import React, { useCallback, useState } from 'react';
import { useCommandState } from 'cmdk';
import { ChevronsUpDown, Search, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Curated suggestions — users can still add any custom label. */
const TECH_STACK_SUGGESTIONS = [
  '.NET',
  'Angular',
  'Astro',
  'AWS',
  'Azure',
  'Bootstrap',
  'C#',
  'C++',
  'Dart',
  'Django',
  'Docker',
  'Electron',
  'Elixir',
  'Express',
  'FastAPI',
  'Fastify',
  'Firebase',
  'Flask',
  'Flutter',
  'GCP',
  'Go',
  'Godot',
  'GraphQL',
  'HTML/CSS',
  'Java',
  'JavaScript',
  'Jest',
  'Kotlin',
  'Kubernetes',
  'Laravel',
  'MongoDB',
  'MySQL',
  'NestJS',
  'Next.js',
  'Node.js',
  'Nuxt',
  'Phoenix',
  'PHP',
  'Playwright',
  'PostgreSQL',
  'Prisma',
  'Python',
  'PyTorch',
  'R',
  'Rails',
  'React',
  'React Native',
  'Redis',
  'Remix',
  'Ruby',
  'Rust',
  'Svelte',
  'SvelteKit',
  'Spring Boot',
  'SQLite',
  'Supabase',
  'Solid.js',
  'Tailwind CSS',
  'TensorFlow',
  'Terraform',
  'TypeScript',
  'Unity',
  'Unreal Engine',
  'Vercel',
  'Vue',
  'Vite',
  'Vitest',
  'WebSockets',
  'WordPress',
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

const fieldShellClass =
  'w-full rounded-md border border-input bg-background text-foreground transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/35 focus-within:ring-offset-2 focus-within:ring-offset-background';

function SuggestionRows({ value, onAddTag }) {
  const searchRaw = useCommandState((s) => s.search);
  const search = searchRaw.trim().toLowerCase();
  const taken = new Set(value.map((v) => v.toLowerCase()));

  const filtered = TECH_STACK_SUGGESTIONS.filter(
    (opt) => !taken.has(opt.toLowerCase()) && (search === '' || opt.toLowerCase().includes(search))
  );

  const exactSuggestionMatch = TECH_STACK_SUGGESTIONS.some((o) => o.toLowerCase() === search);
  const showCustomRow =
    searchRaw.trim().length > 0 && !taken.has(searchRaw.trim().toLowerCase()) && !exactSuggestionMatch;

  return (
    <>
      <CommandGroup heading="Suggestions">
        {filtered.map((tech) => (
          <CommandItem
            key={tech}
            value={tech}
            onSelect={() => {
              onAddTag(tech);
            }}
          >
            {tech}
          </CommandItem>
        ))}
      </CommandGroup>
      {showCustomRow && (
        <CommandGroup heading="Custom">
          <CommandItem
            value={`__custom:${searchRaw.trim()}`}
            onSelect={() => {
              onAddTag(searchRaw.trim());
            }}
          >
            Add &quot;{searchRaw.trim()}&quot;
          </CommandItem>
        </CommandGroup>
      )}
      {filtered.length === 0 && !showCustomRow && (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          {value.length > 0 && search === '' ? 'All listed suggestions are already added.' : 'No matches. Try another search or type a custom name.'}
        </p>
      )}
    </>
  );
}

/**
 * Searchable multi-select for tech labels; controlled string[] (trimmed, caller may normalize).
 */
export function TechStackPicker({ id, value, onChange, className, triggerTestId }) {
  const [open, setOpen] = useState(false);

  const addTag = useCallback(
    (raw) => {
      const next = raw.trim();
      if (!next) return;
      const lower = next.toLowerCase();
      if (value.some((v) => v.toLowerCase() === lower)) return;
      onChange([...value, next]);
    },
    [value, onChange]
  );

  const removeTag = useCallback(
    (tag) => {
      onChange(value.filter((v) => v !== tag));
    },
    [value, onChange]
  );

  return (
    <div className={cn(fieldShellClass, 'px-3 py-2.5', className)}>
      <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1 font-normal">
            {tag}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-muted-foreground/15 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            role="combobox"
            id={id}
            aria-expanded={open}
            className="mt-2 h-9 w-full justify-between px-2 font-normal text-muted-foreground hover:text-foreground hover:bg-muted/60"
            data-testid={triggerTestId}
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              {value.length ? 'Search or add another technology…' : 'Search technologies (e.g. React, PostgreSQL)…'}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[100] w-[min(calc(100vw-2rem),28rem)] p-0"
          align="start"
          side="bottom"
          collisionPadding={12}
        >
          <Command shouldFilter={false} className="rounded-md border-0 shadow-none">
            <CommandInput placeholder="Type to filter or add…" />
            <CommandList>
              <SuggestionRows value={value} onAddTag={addTag} />
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
