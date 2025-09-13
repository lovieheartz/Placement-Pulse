# NSEC Placement Portal

## Getting Started

### Starting the Application

1. Run the `start-app.bat` file to start both the server and client:
   - Double-click on `start-app.bat` in the root directory
   - This will start the server on port 3001 and the client on port 5173

### Manual Start

If you prefer to start the applications manually:

#### Server
```bash
cd server
npm start
```

#### Client
```bash
cd client
npm run dev
```

## Troubleshooting

### Connection Refused Errors

If you see `ERR_CONNECTION_REFUSED` errors in the browser console:

1. Make sure the server is running on port 3001
2. Check the server console for any errors
3. Restart the server if needed

### API Configuration

The API configuration is centralized in `client/src/config/api.js`. If you need to change the API URL or endpoints, update this file.

## Development

### API Configuration

When developing new features that require API calls, use the API configuration:

```javascript
import API_CONFIG from '../config/api';

// Example API call
axios.get(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.USER), {
  headers: { Authorization: `Bearer ${token}` }
});
```