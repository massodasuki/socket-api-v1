module.exports = {
  apps : [{
    script: 'main.js',
    instances: 'max', // 'max' will create as many instances as available CPU cores
    autorestart: true,
    cron_restart: '0 21 * * *', // Cron schedule 5 am Malaysia time
    exec_mode: 'cluster',
    watch: '.',
    node_args: ['--max-old-space-size=2048']
  }]
};
