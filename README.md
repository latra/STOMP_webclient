# STOMP Debugger

Web client for testing STOMP servers. Connect, subscribe to topics, and see messages in real time.

## Setup

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser (or the specific port provided by npm).

## Features

- Connect to STOMP servers over WebSocket
- Custom auth headers
- Subscribe to topics with custom headers
- Save multiple connection configs
- Real-time message viewer

## Usage

1. Fill in your server URL
2. Add auth headers (token, session-token, etc)
3. Connect
4. Set subscription destination and fields
5. Subscribe and watch messages come in

All configs are saved to localStorage.
