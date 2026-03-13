module.exports = {
    apps: [{
        name: 'maintqr-api',
        script: 'dist/index.js',
        cwd: '/var/www/maintqr-api/server',
        env: {
            NODE_ENV: 'production',
        },
        instances: 1,
        exec_mode: 'fork',
        watch: false,
        max_memory_restart: '256M',
        error_file: '/var/log/pm2/maintqr-error.log',
        out_file: '/var/log/pm2/maintqr-out.log',
        merge_logs: true,
        time: true,
    }],
};
