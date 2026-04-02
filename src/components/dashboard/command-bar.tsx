'use client'

import { useState, useEffect } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import { 
  Search, 
  Mail, 
  Send, 
  Archive, 
  Trash2, 
  Star, 
  Settings,
  Zap,
  Moon,
  Sun
} from 'lucide-react'
import { useTheme } from 'next-themes'

export function CommandBar() {
  const [open, setOpen] = useState(false)
  const { setTheme, theme } = useTheme()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem>
            <Mail className="mr-2 h-4 w-4" />
            <span>Go to Inbox</span>
          </CommandItem>
          <CommandItem>
            <Send className="mr-2 h-4 w-4" />
            <span>Go to Sent</span>
          </CommandItem>
          <CommandItem>
            <Archive className="mr-2 h-4 w-4" />
            <span>Go to Archive</span>
          </CommandItem>
          <CommandItem>
            <Star className="mr-2 h-4 w-4" />
            <span>Go to Starred</span>
          </CommandItem>
          <CommandItem>
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Go to Trash</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandGroup heading="Actions">
          <CommandItem>
            <Zap className="mr-2 h-4 w-4" />
            <span>Compose Email</span>
          </CommandItem>
          <CommandItem>
            <Search className="mr-2 h-4 w-4" />
            <span>Search Emails</span>
          </CommandItem>
          <CommandItem>
            <Zap className="mr-2 h-4 w-4" />
            <span>AI Chat</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>Toggle Theme</span>
          </CommandItem>
          <CommandItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}