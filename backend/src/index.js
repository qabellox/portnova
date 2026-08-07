const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const jobRoutes = require('./routes/jobs');
const courseRoutes = require('./routes/courses');
const cvRoutes = require('./routes/cv');
const applicationRoutes = require('./routes/applications');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 5000;

app.use(helmet());
app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    })
);
app.use(express.json());
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
    })
);

console.log('Supabase backend connection initialized.');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/applications', applicationRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'portnova-backend' });
});

app.use(errorHandler);

app.listen(port, () => {
    console.log(`PortNova backend listening on port ${port}`);
});