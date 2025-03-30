---
'uniorg-parse': minor
---

Add position tracking to nodes according to the unist spec.

Each node will include a position field with start and end points containing line, column, and offset information when enabled. Position tracking is disabled by default to avoid processing overhead. You can enable it by setting `trackPosition: true` in parser options.