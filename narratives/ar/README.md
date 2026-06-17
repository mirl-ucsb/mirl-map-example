# Second-language narratives

If you enable a second language in `js/config.js`
(`languages.second = { code: "ar", rtl: true, label: "العربية" }`), put
translated narratives in this folder, named the same as the English file:

```
narratives/sample-01.md        (default language)
narratives/ar/sample-01.md     (second language)
```

This folder is named `ar/` only as the shipped example. If your second language
is, say, Spanish, the loader still reads from `narratives/ar/` unless you change
the path in `js/narratives.js` — the simplest convention is to keep the `ar/`
folder name and just put your second language's files in it, or rename the
folder and update the one `fetch('narratives/ar/' + ...)` line in
`js/narratives.js`.

When a translated file is missing or empty, the default-language narrative is
shown. Quotations should use the original sourced text, never a machine
back-translation.
