# TimeKeeper

TimeKeeper is an offline-friendly, browser-based countdown timer for conference presenters. It provides a large, high-contrast display suitable for sharing on a projector or confidence monitor.

## Features

- Create up to five independently configured timers.
- Import a program PDF and create timers from its most frequent schedule durations.
- Start, pause, reset, and switch timers with keyboard shortcuts.
- Display hours only while one hour or more remains, then switch to minutes and seconds.
- Keep running timers accurate with timestamp-based calculations.
- Save timers, the selected timer, and the color theme in browser local storage.
- Use fullscreen and hide controls for a clean presenter view.
- Choose light or dark mode.

## Import A Program PDF

Use **Upload program PDF** at the bottom of the timer sidebar. TimeKeeper reads schedule rows, groups matching durations by frequency, and creates up to five timers from the most common durations. A successful import replaces the existing timers.

The importer supports:

- Text-based PDFs with selectable text.
- Schedule time ranges such as `08:30 AM - 09:00 AM` or `13:00 - 13:15`.
- Explicit durations such as `5 mins` or `30 minutes`.
- Multi-page schedule tables and text split by PDF letter spacing.

Scanned or image-only PDFs are not supported. If schedule text cannot be selected and copied from a PDF viewer, the file requires OCR before importing.

PDF processing happens entirely in the browser. TimeKeeper does not upload or save the source document.

## Run Locally

```sh
npm install
npm run dev
```

Open the local URL shown by Vite in a modern browser.

## Shortcuts

| Key | Action |
| --- | --- |
| `Space` | Start or pause the selected timer |
| `R` | Reset the selected timer |
| `1` through `5` | Select a timer |
| `H` | Hide or reveal controls |

## Commands

```sh
npm run dev
npm run lint
npm run build
npm run preview
```

The application stores timer data only in the current browser's local storage. PDF parsing is bundled with the application and requires no external service.
