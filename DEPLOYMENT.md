# 🚀 Production Deployment Guide

Complete guide for deploying Instagram Scheduler Server to production with PM2 and Cloudflare.

## 📋 Prerequisites

### Server Requirements
- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+ installed
- PM2 installed globally: `npm install -g pm2`
- Git installed
- SSL certificate (handled by Cloudflare)

### Local Requirements
- SSH access to your server
- Git repository set up
- Domain configured with Cloudflare

## 🔧 Server Setup

### 1. Initial Server Configuration
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/uploadpost
sudo chown $USER:$USER /var/www/uploadpost
```

### 2. Clone Repository
```bash
cd /var/www
git clone https://github.com/yourusername/uploadpost.git
cd uploadpost/server
```

### 3. Install Dependencies
```bash
npm ci --production
```

## 🌐 Environment Configuration

### 1. Create Production Environment File
```bash
cd /var/www/uploadpost/server
cp .env.example .env
nano .env
```

### 2. Update Environment Variables
```env
NODE_ENV=production
PORT=3001

# Update with your production domain
ALLOWED_ORIGINS=https://yourapp.pages.dev,https://yourdomain.com

# Your n8n webhook URL
N8N_WEBHOOK_URL=https://automate.tech-takeover.net/webhook/8f109fee-9713-4709-8ec2-957935850dc0

# Database path
DB_PATH=./scheduled_posts.db

# Logging
LOG_LEVEL=info

# Scheduler (every 5 minutes)
CRON_SCHEDULE=*/5 * * * *
```

## 🚀 PM2 Deployment

### 1. Start Application
```bash
# Start with production environment
npm run pm2:prod

# Or manually
pm2 start ecosystem.config.js --env production
```

### 2. Save PM2 Configuration
```bash
pm2 save
```

### 3. Setup Auto-Start on Boot
```bash
pm2 startup
# Follow the instructions to run the generated command with sudo
```

### 4. Verify Deployment
```bash
# Check status
pm2 status

# Check logs
pm2 logs instagram-scheduler

# Health check
curl http://localhost:3001/health
```

## 🔗 Cloudflare Configuration

### 1. Frontend Deployment (Cloudflare Pages)
1. Push your frontend files to Git repository
2. Connect Cloudflare Pages to your repository
3. Build settings:
   - Build command: `echo "Static files, no build needed"`
   - Build output directory: `/`
4. Deploy

### 2. Backend API Configuration
If using Cloudflare Workers or Tunnels:

#### Option A: Cloudflare Tunnel (Recommended)
```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create uploadpost-api

# Configure tunnel
nano ~/.cloudflared/config.yml
```

**config.yml:**
```yaml
tunnel: uploadpost-api
credentials-file: /home/ubuntu/.cloudflared/tunnel-id.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
```

```bash
# Start tunnel
cloudflared tunnel run uploadpost-api

# Install as service
sudo cloudflared service install
```

#### Option B: Direct Server (with reverse proxy)
Configure Nginx or Apache to proxy requests to your Node.js server.

### 3. Update Frontend Configuration
Update your frontend to use the production API URL:

```javascript
// In index.html and admin.html
const LOCAL_SCHEDULER_URL = "https://api.yourdomain.com/api/schedule";
```

## 📊 Monitoring & Management

### PM2 Commands
```bash
# Status
pm2 status

# Logs
pm2 logs instagram-scheduler
pm2 logs instagram-scheduler --lines 100

# Restart
pm2 restart instagram-scheduler

# Reload (zero-downtime)
pm2 reload instagram-scheduler

# Stop
pm2 stop instagram-scheduler

# Delete
pm2 delete instagram-scheduler

# Monitor
pm2 monit
```

### Health Monitoring
```bash
# Check application health
curl https://api.yourdomain.com/health

# Check scheduled posts
curl https://api.yourdomain.com/api/posts

# Manual scheduler trigger (for testing)
curl -X POST https://api.yourdomain.com/api/trigger-scheduler
```

## 🔄 Deployment Automation

### Using the Deployment Script
```bash
# Update server details in deploy.sh
nano server/deploy.sh

# Run deployment
./server/deploy.sh
```

### Using PM2 Deploy (Advanced)
```bash
# Setup deployment
pm2 deploy ecosystem.config.js production setup

# Deploy
pm2 deploy ecosystem.config.js production
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Permission Errors
```bash
sudo chown -R $USER:$USER /var/www/uploadpost
```

#### 2. Port Already in Use
```bash
sudo lsof -i :3001
sudo kill -9 PID
```

#### 3. Database Permissions
```bash
chmod 664 /var/www/uploadpost/server/scheduled_posts.db
```

#### 4. PM2 Not Starting on Boot
```bash
pm2 startup
pm2 save
# Run the generated sudo command
```

### Log Locations
- PM2 logs: `~/.pm2/logs/`
- Application logs: `/var/www/uploadpost/server/logs/`
- System logs: `/var/log/` (nginx, system logs)

## 🔐 Security Considerations

1. **Firewall Configuration**
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

2. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique values for production
   - Regularly rotate sensitive credentials

3. **Database Security**
   - Restrict database file permissions
   - Regular backups
   - Monitor for unusual activity

4. **HTTPS Only**
   - Use Cloudflare SSL/TLS encryption
   - Redirect HTTP to HTTPS
   - Set secure CORS origins

## 📈 Performance Optimization

1. **PM2 Clustering** (if needed)
   ```javascript
   // In ecosystem.config.js
   instances: 'max',
   exec_mode: 'cluster'
   ```

2. **Database Optimization**
   - Regular database maintenance
   - Index optimization for large datasets
   - Archive old posts periodically

3. **Caching**
   - Consider Redis for session storage
   - Cache frequently accessed data
   - Use Cloudflare caching for static assets

## 🔄 Updates & Maintenance

### Regular Update Process
1. Pull latest changes: `git pull origin main`
2. Install dependencies: `npm ci --production`
3. Reload application: `pm2 reload instagram-scheduler`
4. Verify health: `curl http://localhost:3001/health`

### Database Backup
```bash
# Backup database
cp scheduled_posts.db "backup_$(date +%Y%m%d_%H%M%S).db"

# Automated backup script
echo "0 2 * * * cp /var/www/uploadpost/server/scheduled_posts.db /home/ubuntu/backups/db_\$(date +\%Y\%m\%d).db" | crontab -
```