# TestSprite Setup

TestSprite MCP sudah dipasang sebagai dev dependency dan ditambahkan ke konfigurasi MCP project.

## Yang sudah diset

- Paket: `@testsprite/testsprite-mcp`
- Bin lokal: `testsprite-mcp-plugin`
- MCP config: `.mcp.json`
- NPM script: `npm run testsprite:mcp`
- Lokasi config TestSprite diarahkan ke `.testsprite` di workspace ini agar tidak bergantung ke `AppData\\Roaming`

## Yang masih perlu kamu isi

Di `.mcp.json`, ganti nilai:

`REPLACE_WITH_YOUR_TESTSPRITE_API_KEY`

dengan API key TestSprite milikmu.

## Referensi resmi

- NPM README: `node_modules/@testsprite/testsprite-mcp/README.md`
- Docs: `https://docs.testsprite.com/mcp/installation`
