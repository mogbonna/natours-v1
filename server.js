const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Handling Uncaught Exception
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('Shutting down due to uncaught exception.');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App listening on port ${port}...!`);
});

// Handling Unhandled Promise Rejection
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled Rejections!💥 Shutting Down...');
  server.close(() => {
    process.exit(1);
  });
});

// Handling Uncaught Exception
process.on('uncaughtException', (err) => {
  console.log(`ERROR: ${err.message}`);
  console.log('Shutting down due to uncaught exception.');
  process.exit(1);
});
