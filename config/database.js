const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // MongoDB Atlas connection string (you'll need to add this to your .env file)
        const MONGODB_URI = process.env.MONGODB_URI;
        
        const conn = await mongoose.connect(MONGODB_URI, {
            // These options ensure proper connection handling
            retryWrites: true,
            w: 'majority',
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            socketTimeoutMS: 45000, // 45 second timeout
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', err => {
            console.error('MongoDB connection error:', err);
            if (err.name === 'MongooseServerSelectionError') {
                console.error('Server selection timeout - possible 503 error');
            }
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

        // Handle process termination
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

module.exports = connectDB; 