# Rubik's cube solver

A single-page web app that solves your _physical_ Rubik's cube:

1. **Scan** — point the camera at each of the six faces (guided, one face at a time).
2. **Check** — the detected stickers are shown on an unfolded net; tap any sticker to fix it.
3. **Solve** — Kociemba's two-phase algorithm finds a short solution (≈20 moves).
4. **Follow** — a 3D cube animates each move for you to repeat on the real cube.

Everything runs in the browser; there is no backend.

## Development

```sh
npm install
npm run dev        # opens http://localhost:5173/rubik_cube.html
npm test           # unit + solver integration tests (Vitest)
npm run lint       # ESLint
npm run typecheck  # tsc
npm run build      # production build into dist/
```

Dev shortcut: `rubik_cube.html?scramble=R%20U%20F'` skips the camera and opens the
review screen with that scramble applied to a solved cube.

The camera only works in a secure context (HTTPS or `localhost`).

## Deploying

`npm run build` produces `dist/` with `rubik_cube.html` and an `assets/` folder. Copy the
contents of `dist/` into any subfolder of a static site and open
`https://<site>/<subfolder>/rubik_cube.html`. All URLs are relative, so the subfolder name
does not matter, and no `index.html` is required (the host this is built for cannot serve one).

## License

Apache 2.0 — see [LICENSE](LICENSE).
