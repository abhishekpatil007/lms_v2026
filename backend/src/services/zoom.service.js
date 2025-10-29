// src/services/zoom.service.js
import axios from 'axios';
import jwt from 'jsonwebtoken';
import qs from 'querystring';
import crypto from 'crypto';

const ZOOM_API_KEY = process.env.ZOOM_API_KEY;
const ZOOM_API_SECRET = process.env.ZOOM_API_SECRET;
const ZOOM_API_URL = 'https://api.zoom.us/v2';

// Create a Zoom JWT (short lived) for API calls (JWT App credentials)
const createJwtToken = () => {
    const payload = {
        iss: ZOOM_API_KEY,
        exp: Math.floor(Date.now() / 1000) + 60 * 5
    };
    return jwt.sign(payload, ZOOM_API_SECRET);
};

/**
 * Create a Zoom meeting (type 2 = scheduled meeting)
 * Requires ZOOM_API_KEY and ZOOM_API_SECRET env vars for JWT App
 * Returns Zoom API response (meeting object)
 */
export const createZoomMeeting = async ({ topic, start_time, duration = 60, settings = {} }) => {
    const token = createJwtToken();

    const body = {
        topic,
        type: 2,
        start_time,
        duration,
        settings: {
            join_before_host: false,
            participant_video: true,
            host_video: true,
            mute_upon_entry: true,
            waiting_room: true,
            ...settings
        }
    };

    // Create meeting for the authenticated user (me)
    const res = await axios.post(`${ZOOM_API_URL}/users/me/meetings`, body, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    return res.data;
};

/**
 * Generate a signature for Zoom Web SDK (frontend)
 * NOTE: Zoom's official signature algorithm differs by SDK version.
 * This implementation produces a JWT-based signature acceptable for many setups.
 *
 * Parameters:
 * - meetingNumber: Zoom meeting id (string/number)
 * - role: 0 for attendee, 1 for host
 *
 * Returns: { signature }
 *
 * IMPORTANT: Verify with your chosen Zoom Web SDK version if it requires a different signature format.
 */
export const generateZoomSignature = ({ meetingNumber, role = 0 }) => {
    const iat = Math.floor(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60; // 1 hour
    const oHeader = { alg: 'HS256', typ: 'JWT' };
    const oPayload = {
        sdkKey: ZOOM_API_KEY,
        mn: String(meetingNumber),
        role,
        iat,
        exp,
        appKey: ZOOM_API_KEY,
        tokenExp: exp
    };

    const signature = jwt.sign(oPayload, ZOOM_API_SECRET, { header: oHeader });
    return signature;
};
