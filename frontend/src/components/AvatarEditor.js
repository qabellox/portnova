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
            // WYSIWYG export: render the FULL image onto an offscreen canvas
            // using the exact same transform as the preview (pan -> rotate ->
            // scale, centered), then copy out the stage square and upscale it
            // to the export size. This guarantees the saved photo looks exactly
            // like what the user framed in the editor.
            const W = box.width;
            const H = box.height;
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const rad = ((rotation % 360) + 360) % 360;
            const radians = (rad * Math.PI) / 180;
            const cosA = Math.abs(Math.cos(radians));
            const sinA = Math.abs(Math.sin(radians));

            // Bounding box of the rotated + scaled image.
            const bbW = nw * zoom * cosA + nh * zoom * sinA;
            const bbH = nw * zoom * sinA + nh * zoom * cosA;

            const off = document.createElement('canvas');
            off.width = Math.max(1, Math.ceil(bbW));
            off.height = Math.max(1, Math.ceil(bbH));
            const octx = off.getContext('2d');
            octx.imageSmoothingEnabled = true;
            octx.imageSmoothingQuality = 'high';
            // Image centre is placed at the canvas centre, then rotated/scaled,
            // matching the preview transform-origin: center.
            octx.translate(off.width / 2, off.height / 2);
            octx.rotate(radians);
            octx.scale(zoom, zoom);
            octx.drawImage(img, -nw / 2, -nh / 2);

            // The stage square relative to the image centre (preview centring:
            // image centre sits at stage centre + pan).
            const offX = off.width / 2 - W / 2 - pan.x;
            const offY = off.height / 2 - H / 2 - pan.y;

            const canvas = document.createElement('canvas');
            canvas.width = EXPORT_SIZE;
            canvas.height = EXPORT_SIZE;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
            ctx.drawImage(off, offX, offY, W, H, 0, 0, EXPORT_SIZE, EXPORT_SIZE);

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
                                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) rotate(${rotation}deg) scale(${zoom})`,
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
