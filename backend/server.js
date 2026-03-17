import dotenv from 'dotenv';
dotenv.config();

import { initCronJobs } from './src/services/cron.service.js';
initCronJobs();

import './src/app.js';
