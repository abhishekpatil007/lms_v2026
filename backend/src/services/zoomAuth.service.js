import axios from "axios";

let cachedToken = null;
let tokenExpiry = null;

export const getZoomAccessToken = async () => {
    const now = Date.now();

    // ✅ Use cached token if it's still valid
    if (cachedToken && tokenExpiry && now < tokenExpiry) {
        return cachedToken;
    }

    // 🔄 Otherwise, fetch a new one
    try {
        const response = await axios.post(
            "https://zoom.us/oauth/token",
            new URLSearchParams({
                grant_type: "account_credentials",
                account_id: process.env.ZOOM_ACCOUNT_ID,
            }),
            {
                auth: {
                    username: process.env.ZOOM_CLIENT_ID,
                    password: process.env.ZOOM_CLIENT_SECRET,
                },
            }
        );

        const token = response.data.access_token;
        const expiresIn = response.data.expires_in * 1000; // in ms

        // Cache it with 1-hour expiry
        cachedToken = token;
        tokenExpiry = now + expiresIn - 60 * 1000; // subtract 1 min buffer

        console.log("🔐 Zoom token refreshed at", new Date().toISOString());
        return token;
    } catch (error) {
        console.error("❌ Error fetching Zoom access token:", error.response?.data || error);
        throw new Error("Failed to fetch Zoom access token");
    }
};
