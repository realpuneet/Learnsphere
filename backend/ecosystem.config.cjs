module.exports = {
  apps: [
    { name: 'learnsphere-api', script: 'src/server.js', instances: 'max', exec_mode: 'cluster', env: { NODE_ENV: 'production', START_WORKER: 'false' }, max_memory_restart: '600M' },
    { name: 'learnsphere-worker', script: 'src/jobs/worker.js', instances: 2, exec_mode: 'fork', env: { NODE_ENV: 'production' } },
  ],
};
