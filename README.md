# Instagram Scheduler Server

A Node.js server that handles scheduled Instagram posts by storing them in a database and automatically posting them via your existing n8n workflow.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Start the Server
```bash
npm start
```

The server will start on `http://localhost:3001`

### 3. Start Frontend (in another terminal)
```bash
cd .. # back to uploadpost directory
npm run dev
```

The frontend will run on `http://localhost:3000`

## 📡 API Endpoints

- `POST /api/schedule` - Schedule a new post
- `GET /api/posts` - View all scheduled posts
- `POST /api/trigger-scheduler` - Manually trigger scheduler (for testing)
- `GET /health` - Health check

## 🔄 How It Works

1. **Frontend** → `POST /api/schedule` → **Database** (saves scheduled post)
2. **Scheduler** (runs every 5 minutes) → checks database for due posts
3. **Due posts** → sent to n8n webhook → **Instagram posting**

## 🧪 Testing

### Test Scheduling
```bash
curl -X POST http://localhost:3001/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "Product Title": "Test Product",
    "Product Description": "Test description",
    "Image URL": "https://example.com/image.jpg",
    "Affiliate Link": "https://example.com/link",
    "Schedule DateTime": "2025-09-15T15:30:00",
    "Series Name": "Test Series",
    "sessionId": "test_123"
  }'
```

### View Scheduled Posts
```bash
curl http://localhost:3001/api/posts
```

### Manually Trigger Scheduler
```bash
curl -X POST http://localhost:3001/api/trigger-scheduler
```

## 📊 Database

Uses SQLite database stored in `scheduled_posts.db`. Schema includes:
- Product details (title, description, image, affiliate link)
- Scheduling info (datetime, series name, session ID)
- Status tracking (scheduled, posted, failed)
- Timestamps and error logging

## 🔧 Configuration

- **Port**: 3001 (configurable in server.js)
- **Scheduler**: Runs every 5 minutes (configurable in scheduler.js)
- **n8n Webhook**: Points to your existing immediate posting workflow
- **Database**: SQLite file in server directory

## 📝 Notes

- Immediate posts still use your existing n8n workflow directly
- Only scheduled posts go through this server
- Scheduler automatically starts when server starts
- All posted data is sent to your existing n8n webhook in the same format