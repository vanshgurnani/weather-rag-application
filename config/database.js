const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
    try {
        // If already connected, return the existing connection
        if (isConnected) {
            console.log('Using existing database connection');
            return;
        }

        // MongoDB Atlas connection string
        const MONGODB_URI = process.env.MONGODB_URI;
        
        const conn = await mongoose.connect(MONGODB_URI, {
            retryWrites: true,
            w: 'majority',
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            socketTimeoutMS: 45000, // 45 second timeout
        });

        isConnected = true;
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
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
            isConnected = true;
        });

        // Handle process termination
        const gracefulShutdown = async () => {
            try {
                if (isConnected) {
                    await mongoose.connection.close();
                    console.log('MongoDB connection closed through app termination');
                    isConnected = false;
                }
                process.exit(0);
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
                process.exit(1);
            }
        };

        // Handle different termination signals
        process.on('SIGINT', gracefulShutdown); // For Ctrl+C
        process.on('SIGTERM', gracefulShutdown); // For Docker/Kubernetes shutdown
        process.on('SIGUSR2', gracefulShutdown); // For Nodemon restart

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

// Export both the connection function and status
module.exports = {
    connectDB,
    isConnected: () => isConnected
}; 