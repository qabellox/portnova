import React, { useEffect, useRef, useState } from 'react';
import '../styles/videoBackground.css';

/**
 * The hero loop is ~4.4MB. On a metered or 2G connection streaming it is a far
 * worse first impression than the navy gradient behind it, so the video is only
 * mounted when the browser reports it can afford to.
 */
const canAffordVideo = () => {
    if (typeof window === 'undefined') return false;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion && reduceMotion.matches) return false;

    const connection = navigator.connection;
    if (connection && connection.saveData) return false;
    if (connection && connection.effectiveType && /^(slow-2g|2g)$/.test(connection.effectiveType)) return false;

    return true;
};

/**
 * Full-screen premium video background for the homepage hero.
 * - Autoplays muted, loops, no controls, no in-video text visible
 *   (cropped via object-position + a dark vignette overlay).
 * - Falls back gracefully to the dark navy gradient behind the content if the
 *   video can't autoplay, isn't supported, or the connection is too slow.
 * - Pauses when scrolled out of view or when the tab is hidden, so it never
 *   burns battery in the background.
 */
const VideoBackground = ({ children }) => {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const [allowed, setAllowed] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Decide once on mount: `canAffordVideo` reads browser APIs only.
    useEffect(() => {
        setAllowed(canAffordVideo());
    }, []);

    // Only fetch the video once the hero is close to the viewport.
    useEffect(() => {
        if (!allowed) return undefined;
        const container = containerRef.current;
        if (!container || typeof IntersectionObserver === 'undefined') {
            setMounted(true);
            return undefined;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setMounted(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(container);
        return () => observer.disconnect();
    }, [allowed]);

    useEffect(() => {
        const video = videoRef.current;
        if (!mounted || !video) return undefined;

        const play = () => {
            const attempt = video.play();
            if (attempt && typeof attempt.catch === 'function') {
                // Autoplay blocked (strict mobile browsers) - the gradient behind
                // the overlay keeps the hero looking premium without the video.
                attempt.catch(() => {});
            }
        };
        const onVisibility = () => {
            if (document.hidden) {
                video.pause();
            } else {
                play();
            }
        };

        play();
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [mounted]);

    return (
        <div className="video-background-container" ref={containerRef}>
            {mounted ? (
                <video
                    ref={videoRef}
                    className="video-background"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    src="/videos/background.mp4"
                >
                    Your browser does not support the video tag.
                </video>
            ) : null}
            <div className="video-overlay">{children}</div>
        </div>
    );
};

export default VideoBackground;