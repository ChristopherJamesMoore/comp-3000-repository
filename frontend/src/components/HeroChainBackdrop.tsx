import React, { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const HeroChainBackdrop: React.FC = () => {
    const [pillGrid, setPillGrid] = useState({ cols: 18, rows: 7 });
    const pillCount = pillGrid.cols * pillGrid.rows;
    const stageRef = useRef<HTMLDivElement>(null);
    const modelRef = useRef<HTMLDivElement>(null);
    const pillFieldRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!stageRef.current) return undefined;

        const stage = stageRef.current;
        const updateGrid = () => {
            const rect = stage.getBoundingClientRect();
            const cols = Math.max(12, Math.ceil(rect.width / 86));
            const rows = Math.max(6, Math.ceil(rect.height / 90));
            setPillGrid((prev) => (prev.cols === cols && prev.rows === rows ? prev : { cols, rows }));
        };

        updateGrid();
        const observer = new ResizeObserver(updateGrid);
        observer.observe(stage);
        window.addEventListener('resize', updateGrid);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateGrid);
        };
    }, []);

    useLayoutEffect(() => {
        if (!stageRef.current || !modelRef.current || !pillFieldRef.current) return undefined;

        const media = gsap.matchMedia();
        let tickerFn: (() => void) | null = null;
        let detachPointerHandlers: (() => void) | null = null;
        let pillTweens: gsap.core.Tween[] = [];

        media.add('(prefers-reduced-motion: no-preference)', () => {
            const ctx = gsap.context(() => {
                const stage = stageRef.current;
                const model = modelRef.current;
                const pillField = pillFieldRef.current;
                if (!stage || !model || !pillField) return;

                const segments = gsap.utils.toArray<HTMLElement>('.home-chain__segment', model);
                gsap.set(model, { rotateX: 12, rotateY: -18, rotateZ: -4, scale: 1, x: 0, y: 0 });
                gsap.set(segments, { transformOrigin: 'center center', y: 0, z: 0, rotateX: 0, rotateZ: 0 });

                const modelXTo = gsap.quickTo(model, 'x', { duration: 0.32, ease: 'power2.out' });
                const modelYTo = gsap.quickTo(model, 'y', { duration: 0.32, ease: 'power2.out' });
                const waveTarget = { amp: 8, cursorX: 0, cursorY: 0 };
                const ampTo = gsap.quickTo(waveTarget, 'amp', { duration: 0.24, ease: 'power2.out' });
                const cursorXTo = gsap.quickTo(waveTarget, 'cursorX', { duration: 0.22, ease: 'power2.out' });
                const cursorYTo = gsap.quickTo(waveTarget, 'cursorY', { duration: 0.22, ease: 'power2.out' });

                const handleWindowPointerMove = (event: PointerEvent) => {
                    const rect = stage.getBoundingClientRect();
                    const inside = event.clientX >= rect.left
                        && event.clientX <= rect.right
                        && event.clientY >= rect.top
                        && event.clientY <= rect.bottom;

                    if (!inside) {
                        modelXTo(0);
                        modelYTo(0);
                        ampTo(8);
                        cursorXTo(0);
                        cursorYTo(0);
                        return;
                    }

                    const nx = (event.clientX - rect.left) / rect.width - 0.5;
                    const ny = (event.clientY - rect.top) / rect.height - 0.5;
                    modelXTo(nx * 24);
                    modelYTo(ny * 17);
                    ampTo(8.5 + (Math.abs(nx) + Math.abs(ny)) * 9.5);
                    cursorXTo(nx);
                    cursorYTo(ny);
                };

                window.addEventListener('pointermove', handleWindowPointerMove);
                detachPointerHandlers = () => {
                    window.removeEventListener('pointermove', handleWindowPointerMove);
                };

                const pills = pillField.querySelectorAll<HTMLElement>('.home-chain__pill');
                const bounds = pillField.getBoundingClientRect();
                const pillWidth = 7;
                const pillHeight = 16;
                const minX = 2;
                const minY = 2;
                const maxX = Math.max(minX, bounds.width - pillWidth - 2);
                const maxY = Math.max(minY, bounds.height - pillHeight - 2);

                pills.forEach((pill, index) => {
                    const row = Math.floor(index / pillGrid.cols);
                    const col = index % pillGrid.cols;
                    const x = pillGrid.cols > 1
                        ? minX + (col / (pillGrid.cols - 1)) * (maxX - minX)
                        : (minX + maxX) * 0.5;
                    const y = pillGrid.rows > 1
                        ? minY + (row / (pillGrid.rows - 1)) * (maxY - minY)
                        : (minY + maxY) * 0.5;

                    gsap.set(pill, {
                        x,
                        y,
                        rotation: Math.random() * 360,
                        scale: 0.85,
                    });

                    pillTweens.push(
                        gsap.to(pill, {
                            rotation: '+=360',
                            duration: Math.random() * 4 + 4,
                            repeat: -1,
                            ease: 'none',
                        })
                    );
                });

                tickerFn = () => {
                    const t = gsap.ticker.time;
                    const amp = waveTarget.amp;
                    segments.forEach((segment, index) => {
                        const phase = index * 0.72 + t * 2.1 + waveTarget.cursorX * 2.4;
                        const secondary = index * 0.5 + t * 1.55 + waveTarget.cursorY * 1.8;
                        gsap.set(segment, {
                            y: Math.sin(phase) * amp,
                            z: Math.cos(secondary) * (amp * 0.72),
                            rotateX: Math.cos(phase * 0.9) * (amp * 0.34),
                            rotateZ: Math.sin(secondary * 0.95) * (amp * 0.42)
                        });
                    });
                };
                gsap.ticker.add(tickerFn);
            }, stageRef);
            return () => ctx.revert();
        });

        return () => {
            if (tickerFn) gsap.ticker.remove(tickerFn);
            if (detachPointerHandlers) detachPointerHandlers();
            pillTweens.forEach((tween) => tween.kill());
            media.revert();
        };
    }, [pillGrid.cols, pillGrid.rows]);

    return (
        <div className="hero-chain-backdrop" ref={stageRef} aria-hidden="true">
            <div className="home-chain__pillfield" ref={pillFieldRef}>
                {Array.from({ length: pillCount }).map((_, index) => (
                    <div className="home-chain__pill" key={index}>
                        <span className="home-chain__pill-half home-chain__pill-half--blue" />
                        <span className="home-chain__pill-half home-chain__pill-half--white" />
                    </div>
                ))}
            </div>
            <div className="home-chain__model" ref={modelRef}>
                {Array.from({ length: 8 }).map((_, index) => (
                    <div className="home-chain__segment" key={index}>
                        <div className="home-chain__node">
                            <span className="home-chain__face home-chain__face--front" />
                            <span className="home-chain__face home-chain__face--back" />
                            <span className="home-chain__face home-chain__face--right" />
                            <span className="home-chain__face home-chain__face--left" />
                            <span className="home-chain__face home-chain__face--top" />
                            <span className="home-chain__face home-chain__face--bottom" />
                            {index < 7 && <span className="home-chain__connector" />}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HeroChainBackdrop;
