import React, { useEffect, useRef } from 'react';
import { ZoomMtg } from '@zoom/meetingsdk';

interface ZoomMeetingProps {
    status: boolean;
    meetingNumber: string;
    userName: string;
    userEmail: string;
    passWord?: string;
    signature: string;
    sdkKey: string;
    tk?: string;
    zak?: string;
    onLeave?: () => void;
}

const ZoomMeeting: React.FC<ZoomMeetingProps> = ({
    meetingNumber,
    userName,
    userEmail,
    passWord,
    signature,
    sdkKey,
    tk,
    zak,
    onLeave
}) => {
    const hasCalledInit = useRef(false);

    useEffect(() => {
        console.log('ZoomMeeting Mounted/Updated - Lifecycle Sync');
        
        // Global SDK Configuration - Idempotent
        ZoomMtg.setZoomJSLib('https://source.zoom.us/5.1.4/lib', '/av');
        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareWebSDK();
        ZoomMtg.i18n.load('en-US');
        ZoomMtg.i18n.reload('en-US');

        // Style setup
        document.body.style.overflow = 'hidden';
        const links = [
            'https://source.zoom.us/5.1.4/css/bootstrap.css',
            'https://source.zoom.us/5.1.4/css/react-select.css'
        ];
        const linkElements = links.map(href => {
            const link = document.createElement('link');
            link.type = 'text/css'; link.rel = 'stylesheet'; link.href = href;
            document.head.appendChild(link);
            return link;
        });

        const initMeeting = () => {
            // Guard against multiple calls to .init() if it's already joined
            if (hasCalledInit.current) {
                console.log('Skipping init: already called for this component instance');
                return;
            }
            
            console.log('Executing ZoomMtg.init()...');
            ZoomMtg.init({
                leaveUrl: window.location.origin,
                patchJsMedia: true,
                success: () => {
                    console.log('Zoom SDK Init Success. Joining meeting...');
                    hasCalledInit.current = true;
                    ZoomMtg.join({
                        signature,
                        sdkKey,
                        meetingNumber,
                        userName,
                        userEmail,
                        passWord: passWord || '',
                        tk: tk || '',
                        zak: zak || '',
                        success: (res: any) => console.log('Zoom Join Success:', res),
                        error: (err: any) => console.error('Zoom Join Error:', err)
                    });
                },
                error: (err: any) => {
                    console.error('Zoom Init Error:', err);
                }
            });
        };

        // Delay execution slightly to ensure DOM is ready and assets are parsed
        const timer = setTimeout(initMeeting, 1500);

        return () => {
            console.log('ZoomMeeting Unmounting - Cleanup');
            clearTimeout(timer);
            document.body.style.overflow = '';
            linkElements.forEach(link => {
                if (link.parentNode) document.head.removeChild(link);
            });
            // We don't reset hasCalledInit.current here because if it remounts, 
            // we MIGHT want to try again, but usually StrictMode remounts fast enough 
            // that the timer catch it.
        };
    }, [meetingNumber, userName, userEmail, passWord, signature, sdkKey]);

    return (
        <div 
            id="zmmtg-root" 
            className="fixed inset-0 z-[99999] bg-white"
            style={{ display: 'block' }}
        />
    );
};

export default ZoomMeeting;
