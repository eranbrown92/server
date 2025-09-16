module.exports = {
  apps: [
    {
      name: 'instagram-scheduler',
      script: './server.js',
      cwd: '/var/www/uploadpost/server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // Auto-restart settings
      watch: false,
      max_memory_restart: '200M',
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',

      // Logging
      log_file: './logs/app.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Auto-restart on file changes (disable in production)
      ignore_watch: [
        'node_modules',
        'logs',
        '*.db',
        '*.log'
      ],

      // Health monitoring
      health_check_url: 'http://localhost:3001/health',
      health_check_grace_period: 3000,

      // Advanced settings
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,

      // Environment variables for production
      env_file: '.env'
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/uploadpost.git',
      path: '/var/www/uploadpost',
      'pre-deploy-local': '',
      'post-deploy': 'cd server && npm ci --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};