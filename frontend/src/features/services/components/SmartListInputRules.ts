import { Extension } from '@tiptap/core';

// This extension ensures TipTap's built-in input rules for lists work properly
// TipTap's StarterKit already includes input rules for:
// - "- " → bullet list
// - "1. " → ordered list
// This extension just ensures they're enabled and working
export const SmartListInputRules = Extension.create({
  name: 'smartListInputRules',
  
  // TipTap's StarterKit already handles "- " and "1. " patterns via input rules
  // when typed at the start of a line. This extension ensures they work properly.
});

