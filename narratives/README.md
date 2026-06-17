# Narratives

One Markdown file per photograph holds its written narrative. The filename is
the photo's filename without its extension:

```
photos/sample-01.jpg   →   narratives/sample-01.md
```

Photographs without a file here simply show their caption; narratives are
optional.

## Writing

- Plain Markdown. A blank line separates paragraphs.
- `**bold**` and `*italic*` are supported.
- Citation tokens like `[SAMP]` or `[SAMP p.12]` resolve against
  `js/data/sources.js` and render as superscript links, with a deduplicated
  source list appended under the narrative. Tokens are 2 to 8 uppercase letters.

## A second language

Translations live in `narratives/ar/<filename>.md` (swap `ar/` for your second
language's code, set in `js/config.js`). When a translated file is absent, the
default-language narrative is shown instead. See `narratives/ar/README.md`.

## Editorial voice

Set your own. A useful default for documentary work: cite every factual claim,
and never invent a quotation — but that is a content choice, not a rule the
platform enforces.
