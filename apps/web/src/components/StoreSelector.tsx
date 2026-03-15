'use client';

import { Store, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getStoresForSelector, switchActiveStore } from '@/actions/stores';

export function StoreSelector() {
    const [stores, setStores] = useState<any[]>([]);
    const [activeId, setActiveId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getStoresForSelector().then(res => {
            setStores(res.stores);
            setActiveId(res.activeId);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="animate-pulse w-40 h-10 bg-white/5 border border-white/5 rounded-2xl hidden md:block" />;
    }

    return (
        <div className="relative flex items-center group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Store className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            </div>

            <select
                className="h-10 pl-10 pr-10 py-2 bg-zinc-900/50 hover:bg-zinc-800/80 border border-white/10 rounded-2xl text-sm font-medium text-zinc-200 outline-none appearance-none cursor-pointer transition-all focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                value={activeId}
                onChange={async (e) => {
                    setLoading(true);
                    await switchActiveStore(e.target.value);
                    window.location.reload();
                }}
            >
                {stores.map(s => (
                    <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-200 font-medium py-2">
                        {s.name}
                    </option>
                ))}
            </select>

            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            </div>
        </div>
    );
}
