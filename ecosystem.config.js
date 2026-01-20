module.exports = {
  apps: [{
    name: 'nexttalk',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/Chat-PWA/nexttalk',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    // Log paths removed to use default ~/.pm2/logs/ to avoid permission errors
    time: true
  }]
};