import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthFetch } from '../hooks/useAuth';

type CompanySuggestion = { companyName: string; companyType: string };

type CompanyAutocompleteProps = {
    name: string;
    value: string;
    placeholder?: string;
    disabled?: boolean;
    filterType?: string; // e.g. 'distribution', 'pharmacy'
    authFetch: AuthFetch;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelect?: (companyName: string) => void;
};

const CompanyAutocomplete: React.FC<CompanyAutocompleteProps> = ({
    name,
    value,
    placeholder,
    disabled,
    filterType,
    authFetch,
    onChange,
    onSelect,
}) => {
    const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const fetchSuggestions = useCallback(async (query: string) => {
        if (query.length < 1) { setSuggestions([]); return; }
        try {
            const params = new URLSearchParams({ q: query });
            if (filterType) params.set('type', filterType);
            const res = await authFetch(`/api/companies?${params.toString()}`);
            if (res.ok) {
                const data: CompanySuggestion[] = await res.json();
                setSuggestions(data);
            }
        } catch {
            // silently ignore autocomplete failures
        }
    }, [authFetch, filterType]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!value.trim()) { setSuggestions([]); setOpen(false); return; }
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(value);
            setOpen(true);
        }, 200);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [value, fetchSuggestions]);

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

    const handleSelect = (companyName: string) => {
        setOpen(false);
        setSuggestions([]);
        if (onSelect) {
            onSelect(companyName);
        } else {
            // Synthesise a change event
            onChange({ target: { name, value: companyName } } as React.ChangeEvent<HTMLInputElement>);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(suggestions[activeIndex].companyName);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const filtered = suggestions.filter(
        (s) => s.companyName.toLowerCase() !== value.trim().toLowerCase()
    );

    return (
        <div className="field--autocomplete" ref={wrapperRef}>
            <input
                type="text"
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                onFocus={() => { if (filtered.length > 0) setOpen(true); }}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                autoComplete="off"
            />
            {open && filtered.length > 0 && (
                <ul className="autocomplete-list" role="listbox">
                    {filtered.map((s, i) => (
                        <li
                            key={s.companyName}
                            role="option"
                            aria-selected={i === activeIndex}
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(s.companyName); }}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            <span>{s.companyName}</span>
                            <span className="autocomplete-type">{s.companyType}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CompanyAutocomplete;
