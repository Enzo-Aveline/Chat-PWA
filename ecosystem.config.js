module.exports = {
  apps: [{
    name: 'nexttalk',
    script: 'npm',
    args: 'start',
    cwd: '/var/Chat-PWA/nexttalk',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/nexttalk/error.log',
    out_file: '/var/log/nexttalk/out.log',
    time: true
  }]
};