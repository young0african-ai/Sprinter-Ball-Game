# Sprinter Ball Game

**Sprinter Ball Game** is a two-player hide-and-seek arcade game created by **YoungOfAfrica**.

One player is the seeker. The other player is the hider. Run through the map, duck into hiding spots, switch roles each round, and try to win the match before the final score is locked in.

## Features

- Two-player local play on one keyboard
- Running with stamina
- Bushes, tents, crates, and sheds to hide inside
- Tagging, timed rounds, role switching, and scoring
- How to Play screen
- Sound effects with a sound toggle
- Installable web app setup with an icon and offline cache

## How to Play

Player 1:

- Move: `W`, `A`, `S`, `D`
- Run: `Shift`
- Hide: `E`

Player 2:

- Move: Arrow keys
- Run: `/`
- Hide: `Enter`

The seeker scores by tagging the hider. The hider scores by staying hidden until the timer reaches zero.

## Run Locally

Start the local server:

```powershell
node server.js
```

Then open:

```text
http://127.0.0.1:4173/index.html
```

You can also double-click `start-game-server.bat` on Windows.

## Project Structure

```text
.
├── assets/
│   └── icon.svg
├── src/
│   ├── game.js
│   └── styles.css
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── server.js
└── start-game-server.bat
```

## Screenshots

Add screenshots here after publishing or capturing the game screen:

```md
![Sprinter Ball gameplay](assets/screenshot.png)
```

## Ownership

Copyright 2026 YoungOfAfrica. All rights reserved.
