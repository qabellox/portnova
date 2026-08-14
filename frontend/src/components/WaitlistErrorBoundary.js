import React from 'react';

/** Tiny crash shield: if anything inside the waitlist throws at runtime,
 *  show a calm, bilingual fallback instead of a white screen / crash.
 *  The waitlist will be shared at mass scale, so a UI error must never
 *  blank out the page for a visitor. */
class WaitlistErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        // Log for diagnostics without crashing the page.
        if (typeof console !== 'undefined') {
            console.error('[PortNova waitlist] render error:', error, info);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="page-shell page-shell--narrow waitlist-page">
                    <div className="waitlist-brand">
                        <img className="brand__logo" src="/images/logo.png" alt="PortNova" />
                        <span className="brand__name">PortNova</span>
                    </div>
                    <div className="empty-state">
                        تعذّر التحميل مؤقتًا. أعد المحاولة خلال لحظات.
                        <br />
                        Something went wrong. Please try again in a moment.
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default WaitlistErrorBoundary;
