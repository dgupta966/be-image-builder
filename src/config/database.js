const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const uri = process.env.NODE_ENV === 'test' 
        ? process.env.MONGODB_URI_TEST 
        : process.env.MONGODB_URI;

      if (!uri) {
        throw new Error('MongoDB URI is not defined in environment variables');
      }

      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      };

      this.connection = await mongoose.connect(uri, options);

      console.log(`✅ MongoDB connected: ${this.connection.connection.host}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });

      // Handle application termination
      process.on('SIGINT', this.disconnect.bind(this));
      process.on('SIGTERM', this.disconnect.bind(this));

      return this.connection;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        console.log('📴 MongoDB connection closed');
      }
    } catch (error) {
      console.error('❌ Error closing database connection:', error.message);
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  async dropDatabase() {
    if (process.env.NODE_ENV === 'test') {
      await mongoose.connection.dropDatabase();
      console.log('🗑️ Test database dropped');
    } else {
      throw new Error('Database drop is only allowed in test environment');
    }
  }
}

module.exports = new Database();