import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';

/** The conversational chat transcript for the CV Builder. Renders bot/user
 *  bubbles (or an embedded React node like the AchievementExtractor), shows
 *  Nova's "typing…" dots, and auto-scrolls to the newest message. */
const OnboardingQuestions = ({ messages = [], input, setInput, onSend, typing = false, busy = false }) => {
    const { isArabic } = useLanguage();
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages, typing]);

    // Keep the reply box flexible: it grows with the answer (especially for
    // the "write 2-3 sentences" summary question) and shrinks back after send.
    const autoResize = (el) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    };

    useEffect(() => {
        autoResize(inputRef.current);
    }, [input]);

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!input.trim() || busy) return;
        onSend(input.trim());
    };

    const handleKeyDown = (event) => {
        // Enter sends the reply; Shift+Enter inserts a new line.
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (input.trim() && !busy) onSend(input.trim());
        }
    };

    return (
        <div className="cv-chat">
            <div className="cv-chat__scroll" ref={scrollRef}>
                {messages.map((message) =>
                    message.node ? (
                        <div key={message.id} className="cv-chat__row cv-chat__row--bot">
                            <div className="cv-chat__avatar" aria-hidden="true">🦉</div>
                            <div className="cv-chat__bubble cv-chat__bubble--bot cv-chat__bubble--node">
                                {message.node}
                            </div>
                        </div>
                    ) : (
                        <div key={message.id} className={`cv-chat__row cv-chat__row--${message.from}`}>
                            {message.from === 'bot' ? <div className="cv-chat__avatar" aria-hidden="true">🦉</div> : null}
                            <div className={`cv-chat__bubble cv-chat__bubble--${message.from}`}>
                                {message.text}
                            </div>
                        </div>
                    )
                )}
                {typing ? (
                    <div className="cv-chat__row cv-chat__row--bot">
                        <div className="cv-chat__avatar" aria-hidden="true">🦉</div>
                        <div className="cv-chat__bubble cv-chat__bubble--bot">
                            <span className="cv-typing" aria-label={isArabic ? 'نوفا تكتب…' : 'Nova is typing…'}>
                                <i /><i /><i />
                            </span>
                        </div>
                    </div>
                ) : null}
            </div>

            <form className="cv-chat__inputbar" onSubmit={handleSubmit}>
                <textarea
                    ref={inputRef}
                    rows={1}
                    className="input cv-chat__input"
                    value={input}
                    onChange={(event) => {
                        setInput(event.target.value);
                        autoResize(event.currentTarget);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={busy ? (isArabic ? 'انتظر…' : 'Wait…') : isArabic ? 'اكتب ردّك هنا…' : 'Type your reply here…'}
                    disabled={busy}
                    autoFocus
                    aria-label={isArabic ? 'الرد' : 'Reply'}
                />
                <button
                    type="submit"
                    className="premium-button premium-button--primary cv-chat__send"
                    disabled={!input.trim() || busy}
                    aria-label={isArabic ? 'إرسال' : 'Send'}
                >
                    ➤
                </button>
            </form>
        </div>
    );
};

export default OnboardingQuestions;
