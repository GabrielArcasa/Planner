---
version: 1
slug: "site-index-html"
primary_target: "site/index.html"
related_targets: []
---

## Scope

`site/index.html`: the whole app, three tabs (Calendário, Planner, Kanban). Mode: Operate.

## Audience and task

One person organizing their own life on desktop and phone. Click a day, type, done; the week always reflects the calendar; routine repeats weekly; kanban tracks A fazer / Fazendo / Feito separately.

## Direction contract

THESIS: A semana é uma linha de metrô: cada dia é uma estação, cada categoria é uma linha com a sua cor. Refuses the category default: white rounded cards, gray sidebar, one blue accent.

OWN-WORLD: Station concrete ground #F3F4F1, ink #16181A, black station-sign bar with white grotesque type. Categories are SP Metrô line colors as numbered discs: 1 Azul #0455A1, 2 Verde #007E5E, 3 Vermelha #EE3B33, 4 Amarela #FFD100, 5 Lilás #9B3894, 15 Prata #8C9196. One grotesque (Archivo) with tabular numerals. Grids drawn with 1px rules, zero radius except circles (stations, line discs). Yellow marks the active tab and today's band.

STORY: Visitor sees the month, clicks a day, the week line beside it jumps to that week with the day's station open for typing; picks a line, saves. Planner shows the same items per weekday plus routine; Kanban moves cards across three columns.

FIRST VIEWPORT: 72px black sign bar: brand, tabs, line legend. Left: month as a hairline mesh, Sundays and holidays red, the selected week tinted. Right 440px: "Linha da semana", a vertical black rail with 7 station dots; selected station banded yellow, expanded with its items and the add form. Primary action: black "Agendar" button inside the open station.

FORM: SP Metrô signage and line map; candidate 4 of 7 on the ordered list; seed:1459585fae62f84a. Raises: tabular time column (split-flap); today as a band (labanotation); done items stamped, never vanish (ticket wallet); 1px mesh grid, no rounded boxes (design annual); states as marks: empty, filled, struck (centre rail).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

Data export/backup, reminders.
