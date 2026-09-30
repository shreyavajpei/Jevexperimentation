# Timesheet Lens

A single-page app that reads a timesheet export (.xlsx, .xls or .csv) and shows where time goes: client work, business development, pitching, training & CPD, knowledge, mentoring & recruitment, pro bono and firm admin.

Open `index.html` in a browser. Files are parsed locally with SheetJS; nothing is uploaded.

## Step 1 (this version)

- Reads long exports (one row per entry) and wide ones (one column per date). Guesses the columns and lets you correct them.
- Time in decimal hours, 6-minute units, minutes or Excel h:mm.
- Sorts entries with editable keyword rules. This is a baseline. Entries flagged billable count as client work.
- Dashboard: summary tiles, hours by category, weekly or monthly stacked hours, a person × category table with a training-target check, and an entry list where you can correct categories.
- "Copy all rows for Excel" copies every entry with its keyword category and any correction.

## Next

Step 2 replaces the keyword rules with TypeSafe (Jev) judgments and uses the corrected entries to compare the two. That step sends narrative text to an external API, so decide the data-handling position first.
