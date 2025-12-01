module.exports = {
  apps: [
    {
      name: "agora-rtt-frontend",
      script: "npm",
      args: "run dev",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 5100,
      },
      error_file: "./logs/frontend-error.log",
      out_file: "./logs/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
    {
      name: "agora-rtt-backend",
      script: "server.js",
      cwd: "./server",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 5200,
        CORS_ORIGIN: "http://localhost:5100",
      },
      error_file: "../logs/backend-error.log",
      out_file: "../logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
}

