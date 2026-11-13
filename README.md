# TradeBuddy — Clean version

## Run locally

Install Node.js 18 or newer. Open this repository in VS Code, then run:

```sh
npm install
npm start
```

Open http://localhost:3001. For another port on PowerShell: `$env:PORT=3002; npm start`.

## Try two players

Open two browser tabs, use different names and the same room code. Upload one image on each side and use ✓ / + / ×. Both players must accept an unchanged offer before cards swap into their carts.

## Deploy online

Create a Render **Web Service** from this GitHub repository. Set build command to `npm install` and start command to `npm start`. Render sets `PORT` automatically. This project needs a running Node.js server for Socket.IO, not static hosting.

## Project files

- `public/index.html` — page layout
- `public/style.css` — styling and responsive layout
- `public/script.js` — browser behavior, drag/drop and upload
- `server.js` — multiplayer server using Express and Socket.IO
- `package.json` — dependencies and start script

## Limitations

Rooms and image data are stored **only in server memory**. A restart erases them. If one player disconnects, the active offer is cancelled. There is no login, identity recovery, or durable image storage. Do not upload private/sensitive pictures. Free hosting may sleep after inactivity.
