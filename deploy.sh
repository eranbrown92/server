#!/bin/bash

# Instagram Scheduler Server Deployment Script
# For Cloudflare/Ubuntu Server with PM2

set -e  # Exit on any error

echo "🚀 Starting deployment of Instagram Scheduler Server..."

# Configuration
APP_NAME="instagram-scheduler"
SERVER_USER="ubuntu"
SERVER_HOST="your-server.com"  # Update with your server
DEPLOY_PATH="/var/www/uploadpost"
REPO_URL="git@github.com:yourusername/uploadpost.git"  # Update with your repo

echo "📋 Deployment Configuration:"
echo "   App Name: $APP_NAME"
echo "   Server: $SERVER_USER@$SERVER_HOST"
echo "   Path: $DEPLOY_PATH"
echo "   Repo: $REPO_URL"
echo ""

# Function to run commands on server
run_remote() {
    ssh $SERVER_USER@$SERVER_HOST "$1"
}

# Function to copy files to server
copy_to_server() {
    scp -r "$1" $SERVER_USER@$SERVER_HOST:"$2"
}

echo "🔍 Checking server connection..."
if ! ssh -o ConnectTimeout=10 $SERVER_USER@$SERVER_HOST "echo 'Connected successfully'"; then
    echo "❌ Cannot connect to server. Please check:"
    echo "   - Server hostname: $SERVER_HOST"
    echo "   - SSH key is set up"
    echo "   - Server is running"
    exit 1
fi

echo "✅ Server connection successful"

echo "📦 Installing dependencies on server..."
run_remote "cd $DEPLOY_PATH/server && npm ci --production"

echo "📋 Creating logs directory..."
run_remote "mkdir -p $DEPLOY_PATH/server/logs"

echo "🔧 Setting up environment file..."
run_remote "cd $DEPLOY_PATH/server && cp .env.example .env"
echo "⚠️  Don't forget to update .env with your production values!"

echo "🛑 Stopping existing PM2 process..."
run_remote "cd $DEPLOY_PATH/server && pm2 stop $APP_NAME || true"

echo "🚀 Starting application with PM2..."
run_remote "cd $DEPLOY_PATH/server && pm2 start ecosystem.config.js --env production"

echo "💾 Saving PM2 configuration..."
run_remote "pm2 save"

echo "⚙️  Setting up PM2 startup script..."
run_remote "pm2 startup | grep -E '^sudo' | bash || true"

echo "📊 Checking application status..."
run_remote "pm2 status"

echo "🔍 Checking application health..."
sleep 5
if run_remote "curl -f http://localhost:3001/health"; then
    echo "✅ Application is healthy!"
else
    echo "❌ Application health check failed"
    echo "📋 Checking logs..."
    run_remote "pm2 logs $APP_NAME --lines 20"
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Update .env file with production values:"
echo "      ssh $SERVER_USER@$SERVER_HOST 'nano $DEPLOY_PATH/server/.env'"
echo ""
echo "   2. Restart the application:"
echo "      ssh $SERVER_USER@$SERVER_HOST 'cd $DEPLOY_PATH/server && pm2 restart $APP_NAME'"
echo ""
echo "📊 Monitor your application:"
echo "   - Status: pm2 status"
echo "   - Logs: pm2 logs $APP_NAME"
echo "   - Monitor: pm2 monit"
echo ""
echo "🔗 Your API will be available at: http://$SERVER_HOST:3001"