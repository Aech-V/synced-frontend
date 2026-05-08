import React from 'react';

const BubbleTail = ({ isOwn, isGlass, bgColor }) => {
    // 1. Native Paths
    const rightFill = 'M 0 0 L 10 0 C 6 2 3 6 1 13 L 0 13 Z';
    const rightStroke = 'M 0 0 L 10 0 C 6 2 3 6 1 13 L 0 13';

    const leftFill = 'M 10 0 L 0 0 C 4 2 7 6 9 13 L 10 13 Z';
    const leftStroke = 'M 10 0 L 0 0 C 4 2 7 6 9 13 L 10 13';

    const pathData = isOwn ? rightFill : leftFill;
    const strokeData = isOwn ? rightStroke : leftStroke;

    const borderColor = isGlass 
        ? 'rgba(128, 128, 128, 0.15)' 
        : (isOwn ? '#93780B' : 'var(--border-subtle)');

    // 2. Bulletproof Data URI encoding for the Glassmorphism mask
    const rawSvg = `<svg width="10" height="13" xmlns="http://www.w3.org/2000/svg"><path d="${pathData}" /></svg>`;
    const maskImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawSvg)}")`;

    return (
        <div style={{
            position: 'absolute',
            top: '-1px',
            [isOwn ? 'right' : 'left']: '-9px',
            width: '10px',
            height: '13px',
            zIndex: 1, 
            transform: 'none' 
        }}>
            {/* GLASSMORPHISM LAYER (Only renders if Transparency is enabled) */}
            {isGlass && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: bgColor,
                    WebkitMaskImage: maskImage,
                    maskImage: maskImage,
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                }} />
            )}
            
            {/* PURE SVG LAYER (100% Reliable Solid Color + Stroke) */}
            <svg width="10" height="13" viewBox="0 0 10 13" style={{ position: 'absolute', inset: 0 }}>
                {/* For solid bubbles, use native SVG fill for a flawless seamless block */}
                {!isGlass && (
                    <path d={pathData} fill={bgColor} />
                )}
                <path d={strokeData} fill="none" stroke={borderColor} strokeWidth="1" />
            </svg>
        </div>
    );
};

export default BubbleTail;