import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as IOServer } from 'socket.io';

import rateLimit from 'express-rate-limit';
import { sequelize } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import batchRoutes from './routes/batch.routes.js';
import courseRoutes from './routes/course.routes.js';
// import attendanceRoutes from './routes/attendance.routes.js';
import liveClassRoutes from './routes/liveClass.routes.js';
import zoomRoutes from './routes/zoom.routes.js';
import documentRoutes from './routes/document.routes.js';
import videoRoutes from './routes/video.routes.js';
import webinarRoutes from './routes/webinar.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import testRoutes from './routes/test.routes.js';
import attemptRoutes from './routes/attempt.routes.js';
import evaluationRoutes from './routes/evaluation.routes.js';

import { initAutoSubmitWorker } from './services/autoSubmit.worker.js';
import { createModuleLogger } from './utils/logger/logger.js';
// import { handleClosePollJob } from './jobs/pollClosure.job.js';

const logger = createModuleLogger('app');


const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
// const io = new IOServer(server, {
//     cors: { origin: '*' } 
// });

// set io on app so controllers can use it
// app.set('io', io);

// Redis connection for BullMQ
// const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// // Create queue
// const pollQueue = new Queue('attendance-poll-queue', { connection });
// app.set('pollQueue', pollQueue);

// // Create worker to process queue jobs
// const pollWorker = new Worker('attendance-poll-queue', async job => {
//     if (job.name === 'close_poll') {
//         await handleClosePollJob(job.data, { io, sequelize });
//     }
// }, { connection });

// pollWorker.on('failed', (job, err) => {
//     console.error('Poll worker failed', job.id, err);
// });

const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200, // Increased from 20 to 200 for development
    message: { message: "Too many requests, try later." }
});

app.get('/', (req, res) => res.json({ message: 'LMS Backend running' }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/batches', authLimiter, batchRoutes);
app.use('/api/courses', authLimiter, courseRoutes);
app.use('/api/live-classes', authLimiter, liveClassRoutes);
app.use("/api/zoom", authLimiter, zoomRoutes);
app.use("/api/documents", authLimiter, documentRoutes);
app.use("/api/videos", authLimiter, videoRoutes);
app.use("/api/webinars", authLimiter, webinarRoutes);
app.use('/api/invoices', authLimiter, invoiceRoutes);
app.use('/api/tests', authLimiter, testRoutes);
app.use('/api/attempts', authLimiter, attemptRoutes);
app.use('/api/evaluation', authLimiter, evaluationRoutes);
// app.use('/api/attendance', attendanceRoutes);

// Socket.IO connection: JWT-based auth and server-side batch validation
// import { verifySocketToken } from './utils/socketAuth.js';
// import { isUserInBatch } from './controllers/batch.controller.js';

// io.use(async (socket, next) => {
//     try {
//         const token = socket.handshake.auth?.token || (socket.handshake.headers?.authorization || '').replace('Bearer ', '');
//         if (!token) return next(new Error('Authentication error'));
//         const payload = verifySocketToken(token);
//         socket.user = payload; // { userId, role, iat, exp }
//         return next();
//     } catch (err) {
//         return next(new Error('Authentication error'));
//     }
// });

// io.on('connection', (socket) => {
//     console.log('Socket connected', socket.id, 'user', socket.user?.userId);

//     // join batch rooms — server-side validate membership
//     socket.on('join_batches', async (payload) => {
//         try {
//             const { batchIds = [] } = payload;
//             for (const bid of batchIds) {
//                 const ok = await isUserInBatch(socket.user.userId, bid);
//                 if (ok) {
//                     socket.join(`batch_${bid}`);
//                 }
//             }
//         } catch (e) {
//             console.error('join_batches error', e);
//         }
//     });

//     // Student respond via socket (fast path)
//     socket.on('attendance:respond', async (payload) => {
//         // payload: { pollId, response } response: 'present'|'absent'
//         try {
//             const attendanceController = await import('./controllers/attendance.controller.js');
//             // call internal handler (it expects req-like object), but to reuse logic we'll call a helper:
//             await attendanceController.recordPollResponseSocket(payload.pollId, socket.user.userId, payload.response, { io, sequelize });
//         } catch (e) {
//             console.error('attendance:respond error', e);
//         }
//     });

//     socket.on('disconnect', () => {
//         console.log('Socket disconnected', socket.id);
//     });
// });

// DB init & server start
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL connected');
        await sequelize.sync();
        console.log('✅ Sequelize models synced');

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    } catch (err) {
        console.error('DB connection/sync error:', err);
        process.exit(1);
    }
})();
