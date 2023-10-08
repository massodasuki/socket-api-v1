module.exports = {
  apps : [{
    script: 'main.js',
    instances: 'max', // 'max' will create as many instances as available CPU cores
    autorestart: true,
    cron_restart: '0 5 * * *', // Cron schedule (e.g., every hour)
    exec_mode: 'cluster',
    watch: '.'
  }]
};
