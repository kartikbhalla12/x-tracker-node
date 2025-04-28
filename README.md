# X-Tracker Launch Node

A Node.js application with Express that handles token launch data.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following content:
```
PORT=3000
```

3. Start the server:
```bash
node index.js
```

## API Endpoints

### POST /launch

Endpoint to submit launch data.

Request body:
```json
{
    "publicKey": "string",
    "privateKey": "string",
    "tokenName": "string",
    "tickerName": "string",
    "twitterUrl": "string (optional)",
    "imageUrl": "string (optional)"
}
```

Response:
```json
{
    "success": true,
    "message": "Launch data received successfully",
    "data": {
        "publicKey": "string",
        "tokenName": "string",
        "tickerName": "string",
        "twitterUrl": "string",
        "imageUrl": "string"
    }
}
```

## Error Handling

The API returns appropriate error responses for:
- Missing required fields (400)
- Server errors (500) 