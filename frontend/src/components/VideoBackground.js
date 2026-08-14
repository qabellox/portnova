import React, { useEffect, useRef } from 'react';
import '../styles/videoBackground.css';

/**
 * Full-screen premium video background for the homepage hero.
 * - Autoplays muted, loops, no controls, no in-video text visible
 *   (cropped via object-position + a dark vignette overlay).
 * - Falls back gracefully to the dark navy gradient behind the content if the
 *   video can't autoplay or isn't supported.
 */
const VideoBackground = ({ children }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.play().catch(() => {
                // Autoplay blocked (strict mobile browsers) - the overlay keeps
                // the hero looking premium without the video.
            });
        }
    }, []);

    return (
        <div className="video-background-container">
            <video
                ref={videoRef}
                className="video-background"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
            >
                <source src="/videos/background.mp4" type="video/mp4" />
                {/* Fallback text if the browser can't play MP4 */}
                Your browser does not support the video tag.
            </video>
            <div className="video-overlay">{children}</div>
        </div>
    );
};

export default VideoBackground;
