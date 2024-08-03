const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Handling Uncaught Exception
process.on('uncaughtException', (err) => {
  g(err.name, err.message);
  g('Shutting down due to uncaught exception.');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => g('DB connection successful!'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  g(`App listening on port ${port}...!`);
});

// Handling Unhandled Promise Rejection
process.on('unhandledRejection', (err) => {
  g(err.name, err.message);
  g('Unhandled Rejections!💥 Shutting Down...');
  server.close(() => {
    process.exit(1);
  });
});

// Handling Uncaught Exception
process.on('uncaughtException', (err) => {
  g(`ERROR: ${err.message}`);
  g('Shutting down due to uncaught exception.');
  process.exit(1);
});
