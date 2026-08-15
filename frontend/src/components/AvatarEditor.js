import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { LoaderButton, PremiumButton } from './PremiumUI';
import '../styles/avatar-editor.css';

/**
 * LinkedIn-style avatar editor: pick a photo, then crop (pan + zoom), rotate
 * and fine-tune brightness/contrast/saturation before it is saved. Produces a
 * high-resolution square export (512px) that is crisp when shown in a circle.
 * No heavy deps - pure canvas + CSS transforms.
 */
const EXPORT_SIZE = 512; // crisp at 2x for 256px circle + retina

const AvatarEditor = ({ file, userId, onClose, onSaved }) => {
    const { isArabic } = useLanguage();
    const wrapRef = useRef(null);
    const imgRef = useRef(null);
    const [srcUrl, setSrcUrl] = useState('');
    const [imgLoaded, setImgLoaded] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const dragRef = useRef(null);
    const imgRefState = useRef(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setSrcUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Fit image to cover the square when it first loads (LinkedIn behaviour).
    const onImgLoad = () => {
        const img = imgRef.current;
        if (!img || !wrapRef.current) return;
        const box = wrapRef.current.getBoundingClientRect();
        const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
        setZoom(scale);
        setPan({ x: 0, y: 0 });
        setImgLoaded(true);
    };

    const onWheel = (e) => {
        e.preventDefault();
        setZoom((z) => clamp(z * (e.deltaY < 0 ? 1.08 : 0.92), 0.2, 6));
    };

    const onPointerDown = (e) => {
        e.preventDefault();
        dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (!dragRef.current) return;
        const { sx, sy, ox, oy } = dragRef.current;
        setPan({ x: ox + (e.clientX - sx), y: oy + (e.clientY - sy) });
    };

    const onPointerUp = () => {
        dragRef.current = null;
    };

    const rotateRight = () => setRotation((r) => (r + 90) % 360);
    const resetView = () => {
        const img = imgRef.current;
        const box = wrapRef.current?.getBoundingClientRect();
        if (img && box) {
            const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
            setZoom(scale);
        }
        setPan({ x: 0, y: 0 });
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const save = async () => {
        const img = imgRefState.current || imgRef.current;
        const box = wrapRef.current?.getBoundingClientRect();
        if (!img || !box) return;
        setSaving(true);
        setError('');
        try {
            // Crop rect in image pixel space from the visible square region.
            const boxW = box.width;
            const boxH = box.height;
            const dispW = img.naturalWidth * zoom;
            const dispH = img.naturalHeight * zoom;
            const sx = (-pan.x + (boxW - dispW) / 2) / zoom;
            const sy = (-pan.y + (boxH - dispH) / 2) / zoom;
            const s = Math.min(dispW, dispH); // the largest centred square we can read
            const srcX = clamp(sx, 0, img.naturalWidth - Math.min(s, img.naturalWidth));
            const srcY = clamp(sy, 0, img.naturalHeight - Math.min(s, img.naturalHeight));
            const srcSize = Math.min(s, img.naturalWidth, img.naturalHeight);

            const canvas = document.createElement('canvas');
            const rot = ((rotation % 360) + 360) % 360;
            const side = rot % 180 === 0 ? EXPORT_SIZE : EXPORT_SIZE;
            canvas.width = side;
            canvas.height = side;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

            if (rot === 0 || rot === 180) {
                ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, side, side);
            } else {
                // For 90/270: rotate the square crop onto the canvas.
                ctx.translate(side / 2, side / 2);
                ctx.rotate((rot * Math.PI) / 180);
                ctx.drawImage(img, srcX, srcY, srcSize, srcSize, -side / 2, -side / 2, side, side);
            }

            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
            if (!blob) throw new Error('export_failed');

            const safe = (file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
            const ext = (safe.split('.').pop() || 'jpg').toLowerCase();
            const path = `${userId}/avatar_${Date.now()}.${ext}`;
            const { supabase } = await import('../services/supabase');
            const { error: upErr } = await supabase.storage
                .from('avatars')
                .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
            if (upErr) throw upErr;
            const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
            onSaved(pub.publicUrl || '');
        } catch (err) {
            setError(err.message || (isArabic ? 'فشل حفظ الصورة.' : 'Failed to save photo.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="avatar-editor">
            <div className="avatar-editor__card">
                <div className="avatar-editor__head">
                    <strong>{isArabic ? 'عدّل صورتك' : 'Edit your photo'}</strong>
                    <button className="avatar-editor__x" type="button" onClick={onClose} aria-label={isArabic ? 'إغلاق' : 'Close'}>✕</button>
                </div>

                <div
                    className="avatar-editor__stage"
                    ref={wrapRef}
                    onWheel={onWheel}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                >
                    {srcUrl ? (
                        <img
                            ref={(el) => { imgRef.current = el; if (el) imgRefState.current = el; }}
                            className="avatar-editor__img"
                            src={srcUrl}
                            alt=""
                            draggable={false}
                            onLoad={onImgLoad}
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                            }}
                        />
                    ) : null}
                    <span className="avatar-editor__ring" aria-hidden="true" />
                    {!imgLoaded ? <span className="avatar-editor__hint">{isArabic ? 'جارٍ التحميل…' : 'Loading…'}</span> : null}
                </div>

                <div className="avatar-editor__controls">
                    <label className="avatar-editor__row">
                        <span>{isArabic ? 'التكبير' : 'Zoom'}</span>
                        <input type="range" min="0.2" max="3" step="0.01" value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))} />
                    </label>
                    <label className="avatar-editor__row">
                        <span>{isArabic ? 'السطوع' : 'Brightness'}</span>
                        <input type="range" min="40" max="160" step="1" value={brightness}
                            onChange={(e) => setBrightness(parseInt(e.target.value, 10))} />
                    </label>
                    <label className="avatar-editor__row">
                        <span>{isArabic ? 'التباين' : 'Contrast'}</span>
                        <input type="range" min="40" max="160" step="1" value={contrast}
                            onChange={(e) => setContrast(parseInt(e.target.value, 10))} />
                    </label>
                    <label className="avatar-editor__row">
                        <span>{isArabic ? 'التشبع' : 'Saturation'}</span>
                        <input type="range" min="0" max="200" step="1" value={saturation}
                            onChange={(e) => setSaturation(parseInt(e.target.value, 10))} />
                    </label>
                    <div className="avatar-editor__row avatar-editor__row--btns">
                        <PremiumButton variant="ghost" type="button" onClick={rotateRight}>
                            {isArabic ? '↻ تدوير' : '↻ Rotate'}
                        </PremiumButton>
                        <PremiumButton variant="ghost" type="button" onClick={resetView}>
                            {isArabic ? 'إعادة ضبط' : 'Reset'}
                        </PremiumButton>
                    </div>
                </div>

                {error ? <p className="muted avatar-editor__error">{error}</p> : null}

                <div className="avatar-editor__actions">
                    <PremiumButton variant="ghost" type="button" onClick={onClose}>
                        {isArabic ? 'إلغاء' : 'Cancel'}
                    </PremiumButton>
                    <LoaderButton variant="gold" type="button" loading={saving} onClick={save}>
                        {saving ? (isArabic ? 'جارٍ الحفظ…' : 'Saving…') : (isArabic ? 'حفظ الصورة' : 'Save photo')}
                    </LoaderButton>
                </div>
            </div>
        </div>
    );
};

export default AvatarEditor;
