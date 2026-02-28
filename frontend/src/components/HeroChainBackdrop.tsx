import React, { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const getPillVariant = (index: number): 'blue' | 'teal' => {
    const bucket = (index * 37 + 13) % 10;
    if (bucket < 7) return 'blue';
    return 'teal';
};

const HeroChainBackdrop: React.FC = () => {
    const [pillGrid, setPillGrid] = useState({ cols: 18, rows: 7 });
    const pillCount = pillGrid.cols * pillGrid.rows;
    const stageRef = useRef<HTMLDivElement>(null);
    const pillFieldRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!stageRef.current) return undefined;

        const stage = stageRef.current;
        const deriveGrid = (width: number, height: number) => {
            const isMobile = width <= 640;
            const isTablet = width > 640 && width <= 1024;
            const spacingX = isMobile ? 32 : isTablet ? 46 : 64;
            const spacingY = isMobile ? 54 : isTablet ? 64 : 72;
            // +1 ensures edge-to-edge fill without visible empty bands.
            const cols = Math.max(14, Math.ceil(width / spacingX) + 1);
            const rows = Math.max(8, Math.ceil(height / spacingY) + 1);
            return { cols, rows };
        };

        const updateGrid = () => {
            const rect = stage.getBoundingClientRect();
            const { cols, rows } = deriveGrid(rect.width, rect.height);
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
        if (!stageRef.current || !pillFieldRef.current) return undefined;

        const media = gsap.matchMedia();
        let tickerFn: (() => void) | null = null;
        let detachPointerHandlers: (() => void) | null = null;
        let pillTweens: gsap.core.Tween[] = [];

        media.add('(prefers-reduced-motion: no-preference)', () => {
            const ctx = gsap.context(() => {
                const stage = stageRef.current;
                const pillField = pillFieldRef.current;
                if (!stage || !pillField) return;

                const hover = { x: -9999, y: -9999, active: false };
                const effectRadius = 120;

                const handlePointerMove = (event: PointerEvent) => {
                    const rect = pillField.getBoundingClientRect();
                    const inside = event.clientX >= rect.left
                        && event.clientX <= rect.right
                        && event.clientY >= rect.top
                        && event.clientY <= rect.bottom;
                    hover.active = inside;
                    if (!inside) return;
                    hover.x = event.clientX - rect.left;
                    hover.y = event.clientY - rect.top;
                };

                const handlePointerLeave = () => {
                    hover.active = false;
                };

                window.addEventListener('pointermove', handlePointerMove);
                stage.addEventListener('pointerleave', handlePointerLeave);
                detachPointerHandlers = () => {
                    window.removeEventListener('pointermove', handlePointerMove);
                    stage.removeEventListener('pointerleave', handlePointerLeave);
                };

                const pills = pillField.querySelectorAll<HTMLElement>('.home-chain__pill');
                const bounds = pillField.getBoundingClientRect();
                const isMobile = bounds.width <= 640;
                const isTablet = bounds.width > 640 && bounds.width <= 1024;
                const pillWidth = 7;
                const pillHeight = 16;
                const minX = 2;
                const minY = 2;
                const maxX = Math.max(minX, bounds.width - pillWidth - 2);
                const maxY = Math.max(minY, bounds.height - pillHeight - 2);
                const cellWidth = pillGrid.cols > 1 ? (maxX - minX) / (pillGrid.cols - 1) : maxX - minX;
                const cellHeight = pillGrid.rows > 1 ? (maxY - minY) / (pillGrid.rows - 1) : maxY - minY;
                const jitterXMax = cellWidth * 0.24;
                const jitterYMax = cellHeight * 0.24;

                const fract = (value: number) => value - Math.floor(value);
                const jitterNoise = (row: number, col: number, seed: number) =>
                    fract(Math.sin((row + 1) * 12.9898 + (col + 1) * 78.233 + seed) * 43758.5453123);

                const pillEntries: Array<{
                    x: number;
                    y: number;
                    scaleTo: (value: number) => gsap.core.Tween;
                    yTo: (value: number) => gsap.core.Tween;
                }> = [];

                pills.forEach((pill, index) => {
                    const row = Math.floor(index / pillGrid.cols);
                    const col = index % pillGrid.cols;
                    const baseX = pillGrid.cols > 1
                        ? minX + (col / (pillGrid.cols - 1)) * (maxX - minX)
                        : (minX + maxX) * 0.5;
                    const baseY = pillGrid.rows > 1
                        ? minY + (row / (pillGrid.rows - 1)) * (maxY - minY)
                        : (minY + maxY) * 0.5;
                    const jitterX = (jitterNoise(row, col, 0.17) - 0.5) * 2 * jitterXMax;
                    const jitterY = (jitterNoise(row, col, 1.91) - 0.5) * 2 * jitterYMax;
                    const x = Math.min(maxX, Math.max(minX, baseX + jitterX));
                    const y = Math.min(maxY, Math.max(minY, baseY + jitterY));

                    gsap.set(pill, {
                        x,
                        y,
                        rotation: Math.random() * 360,
                        scale: 0.75,
                    });

                    pillEntries.push({
                        x,
                        y,
                        scaleTo: gsap.quickTo(pill, 'scale', { duration: 0.24, ease: 'power2.out' }),
                        yTo: gsap.quickTo(pill, 'y', { duration: 0.24, ease: 'power2.out' }),
                    });

                    pillTweens.push(
                        gsap.to(pill, {
                            rotation: '+=360',
                            duration: isMobile
                                ? Math.random() * 1.5 + 3.5
                                : isTablet
                                    ? Math.random() * 1.5 + 3
                                    : Math.random() * 2 + 2,
                            repeat: -1,
                            ease: 'none',
                        })
                    );
                });

                tickerFn = () => {
                    pillEntries.forEach((entry) => {
                        let influence = 0;
                        if (hover.active) {
                            const dx = entry.x - hover.x;
                            const dy = entry.y - hover.y;
                            const distance = Math.hypot(dx, dy);
                            influence = Math.max(0, 1 - distance / effectRadius);
                        }

                        entry.scaleTo(0.75 + influence * 1.95);
                        entry.yTo(entry.y - influence * 14);
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
                    <div className={`home-chain__pill home-chain__pill--${getPillVariant(index)}`} key={index}>
                        <span className="home-chain__pill-half home-chain__pill-half--color" />
                        <span className="home-chain__pill-half home-chain__pill-half--white" />
                    </div>
                ))}
            </div>
            {/* <div className="home-chain__model" ref={modelRef}>
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
            </div> */}
        </div>
    );
};

export default HeroChainBackdrop;
