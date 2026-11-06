# Third-party software

This project integrates **obgnail/typora_plugin 1.19.14**, distributed under
the MIT license. The pinned upstream release archive is included unchanged in
`vendor/typora-plugin-1.19.14.zip`. Its original license is retained in
`vendor/LICENSE.typora-plugin`; its URL and SHA-256 are in `vendor/manifest.json`.

Upstream: https://github.com/obgnail/typora_plugin/tree/1.19.14

The archive includes the upstream framework and bundled third-party libraries.
Their original license headers and notices remain in the archive. Upstream's
dependency acknowledgements are reproduced in `vendor/UPSTREAM-ACKNOWLEDGEMENTS.md`.
Only the Callouts module is enabled by this project's fresh-install preset.

`patches/callouts/index.js` is a modified copy of the upstream Callouts module.
It retains attribution and changes title metadata to preserve custom plain-text
titles. The installer backs up the installed module before applying this patch.
The CSS fixture in `tests/fixtures/upstream-callouts.css` is also taken from
that upstream module and retains the same MIT attribution.

The styles and SVG paths in `styles/` were prepared for this project from the
author's personal callout palette. They do not require Obsidian or an icon font.
