import { useEffect, useState } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { getAllAdminSections } from './adminNavItems';

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (sectionId: string) => void;
}

export function AdminCommandPalette({ open, onOpenChange, onNavigate }: AdminCommandPaletteProps) {
  const sections = getAllAdminSections();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to section..." />
      <CommandList>
        <CommandEmpty>No section found.</CommandEmpty>
        <CommandGroup heading="Admin Sections">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <CommandItem
                key={section.id}
                value={`${section.label} ${section.parentLabel || ''}`}
                onSelect={() => {
                  onNavigate(section.id);
                  onOpenChange(false);
                }}
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{section.label}</span>
                {section.parentLabel && (
                  <span className="ml-auto text-xs text-muted-foreground">{section.parentLabel}</span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
