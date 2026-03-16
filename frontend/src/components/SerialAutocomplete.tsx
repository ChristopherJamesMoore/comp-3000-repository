import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Medication } from '../types';

type SerialAutocompleteProps = {
    value: string;
    onChange: (value: string) => void;
    onAdd: (serial: string) => void;
    medications: Medication[];
    /** Status filter — only show medications with this status */
    statusFilter?: string | string[];
    /** Serial numbers already in the batch (to exclude from suggestions) */
    exclude?: string[];
    placeholder?: string;
    disabled?: boolean;
};

const SerialAutocomplete: React.FC<SerialAutocompleteProps> = ({
    value,
    onChange,
    onAdd,
    medications,
    statusFilter,
    exclude = [],
    placeholder = 'RX-2026-00001',
    disabled,
}) => {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const suggestions = useMemo(() => {
        const q = value.trim().toLowerCase();
        if (!q) return [];
        const excludeSet = new Set(exclude.map((s) => s.toLowerCase()));
        const statusArr = statusFilter
            ? (Array.isArray(statusFilter) ? statusFilter : [statusFilter])
            : null;
        return medications.filter((med) => {
            if (excludeSet.has(med.serialNumber.toLowerCase())) return false;
            if (statusArr && !statusArr.includes(med.status || 'manufactured')) return false;
            return (
                med.serialNumber.toLowerCase().includes(q) ||
                med.medicationName.toLowerCase().includes(q) ||
                med.batchNumber.toLowerCase().includes(q)
            );
        }).slice(0, 8); // cap at 8 suggestions
    }, [value, medications, statusFilter, exclude]);

    useEffect(() => {
        setOpen(suggestions.length > 0 && value.trim().length > 0);
        setActiveIndex(-1);
    }, [suggestions, value]);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (serial: string) => {
        setOpen(false);
        onChange('');
        onAdd(serial);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (open && activeIndex >= 0 && suggestions[activeIndex]) {
                handleSelect(suggestions[activeIndex].serialNumber);
            } else if (value.trim()) {
                onAdd(value.trim());
                onChange('');
            }
            return;
        }
        if (!open || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="field--autocomplete" ref={wrapperRef} style={{ flex: 1 }}>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                autoComplete="off"
            />
            {open && suggestions.length > 0 && (
                <ul className="autocomplete-list" role="listbox">
                    {suggestions.map((med, i) => (
                        <li
                            key={med.serialNumber}
                            role="option"
                            aria-selected={i === activeIndex}
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(med.serialNumber); }}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            <span>
                                <strong>{med.serialNumber}</strong>
                                <span style={{ marginLeft: 8, color: 'var(--muted)', fontSize: '0.8rem' }}>
                                    {med.medicationName}
                                </span>
                            </span>
                            <span className="autocomplete-type">{med.batchNumber}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SerialAutocomplete;
