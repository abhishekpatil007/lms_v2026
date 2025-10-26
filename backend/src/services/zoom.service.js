import axios from 'axios';
const ZOOM_API_BASE = 'https://api.zoom.us/v2';

const ZoomService = {
    async createMeeting({ topic, start_time, duration = 60, is_webinar = false }) {
        const token = process.env.ZOOM_JWT_TOKEN;
        if (!token) {
            console.warn('Zoom JWT token not configured; returning mock meeting data');
            // return mock object so flow continues during development
            return { mock: true, join_url: 'https://zoom.us/j/mock', start_url: 'https://zoom.us/s/mock', meetingId: 'mock123' };
        }
        const url = `${ZOOM_API_BASE}/users/me/meetings`;
        const payload = {
            topic,
            type: 2,
            start_time,
            duration,
            settings: { join_before_host: false, approval_type: 0 }
        };
        const resp = await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
        return resp.data;
    }
};

export default ZoomService;
