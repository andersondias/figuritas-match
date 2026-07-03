# Figuritas Match

A static web app to find sticker trades from WhatsApp group messages exported by the [Figuritas App](https://www.figuritas.app).

Paste your sticker list, save it locally, then compare with other collectors' lists to find mutually beneficial swaps.

## Features

- Parse Figuritas App messages in English, Portuguese, and Spanish
- Store your collection in the browser (localStorage)
- Compare with other users' lists to find trades

## Usage

Open `index.html` in a browser, or serve locally:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

> ES modules require a local server — opening the file directly via `file://` won't work in most browsers.

## Deploy

Deploy to any static host (GitHub Pages, Netlify, Cloudflare Pages). No build step required.

## Run Tests

```bash
node test/run-tests.mjs
```

Or open `test/parser.test.html` in a browser (via local server).

## Message Format

The app expects messages like those shared from the Figuritas App:

```
Figuritas App - List
Usa Mex Can 26
I need
MEX 🇲🇽: 1, 17, 18
Swaps
RSA 🇿🇦: 3, 6, 19
Download the app
https://www.figuritas.app/download
```

Portuguese (`Faltantes` / `Repetidas`) and Spanish (`Necesito`) section headers are also supported.
