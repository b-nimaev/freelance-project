import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config()

const url = process.env.mongodb

;(async () => {
    await mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    } as any).catch(error => { console.error(error) });

    mongoose.connection.on('connected', () => {
        console.log('Connected to MongoDB!');
    });
    
})();