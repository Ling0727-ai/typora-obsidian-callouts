# Obsidian note links

The Obsidian Images adapter also lets Typora render note wikilinks as clickable links:

```markdown
[[Note]]
[[folder/Note|display text]]
[[Note#Heading]]
```

The part after `|` is an optional display label. `.md` is added when the target omits
an extension. Links resolve relative to the current note first, then the Obsidian
vault root. When a target is written by name only, the adapter searches Markdown
files under the vault; a unique match is opened directly. Duplicate names remain
unresolved so the link does not guess the wrong note. Heading fragments are
preserved in the resulting link.

The original `[[...]]` text remains the Markdown source. Typora's native inline
lexer creates the clickable link, so code spans and fenced code are left alone.
