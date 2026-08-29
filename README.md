# TimeKeeper

TimeKeeper is an offline-friendly, browser-based countdown timer for conference presenters. It provides a large, high-contrast display suitable for sharing on a projector or confidence monitor.

## Features

- Create up to five independently configured timers.
- Start, pause, reset, and switch timers with keyboard shortcuts.
- Display hours only while one hour or more remains, then switch to minutes and seconds.
- Keep running timers accurate with timestamp-based calculations.
- Save timers, the selected timer, and the color theme in browser local storage.
- Use fullscreen and hide controls for a clean presenter view.
- Choose light or dark mode.

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

The application stores data only in the current browser's local storage, so it works without a network connection after loading.
