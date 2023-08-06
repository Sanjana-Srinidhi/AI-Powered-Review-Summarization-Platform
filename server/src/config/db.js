const mongoose = require('mongoose');
const config = require('./index');

async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongo.uri);
  console.log(`[mongo] connected to ${config.mongo.uri}`);
  return mongoose.connection;
}

module.exports = connectDB;
