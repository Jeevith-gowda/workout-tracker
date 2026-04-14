require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serverless MongoDB Connection Handler
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000,
        });
        isConnected = true;
        console.log('MongoDB Connected successfully!');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        throw err;
    }
};

// Vercel Serverless Middleware: Guarantees connection before any route is processed
app.use('/api', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (e) {
        return res.status(500).json({ error: 'Database connection failed. Check Vercel Environment Variables.' });
    }
});

// Use Vercel Cache Pattern to prevent OverwriteModelError on cold starts
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const WorkoutSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    totalDuration: { type: Number, required: true },
});
const Workout = mongoose.models.Workout || mongoose.model('Workout', WorkoutSchema);

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const newUser = new User({ username: req.body.username });
        await newUser.save();
        res.json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/workouts/:userId', async (req, res) => {
    try {
        const workouts = await Workout.find({ userId: req.params.userId }).sort({ date: -1 });
        res.json(workouts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/workouts', async (req, res) => {
    try {
        const newWorkout = new Workout(req.body);
        await newWorkout.save();
        res.json(newWorkout);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/workouts/:id', async (req, res) => {
    try {
        await Workout.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Catch-all route to serve the SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}


module.exports = app;
