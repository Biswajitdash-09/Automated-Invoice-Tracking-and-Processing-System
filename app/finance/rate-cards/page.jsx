"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import { getRateCards } from "@/lib/api";
import PageHeader from "@/components/Layout/PageHeader";
import { motion } from "framer-motion";

export default function FinanceRateCards() {
    const [rateCards, setRateCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const data = await getRateCards(); // Finance can access admin route via permissions we added
                setRateCards(data.rateCards || []);
            } catch (err) {
                console.error("Failed to fetch rate cards", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRates();
    }, []);

    const filteredCards = rateCards.filter(card => 
        (card.projectName || "").toLowerCase().includes(filter.toLowerCase()) ||
        (card._id || "").toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
            <PageHeader
                title="Rate Card Directory"
                subtitle="Centralized repository of all active vendor rate cards for financial verification."
                icon="ShieldCheck"
                accent="indigo"
                roleLabel="Finance"
                actions={
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filter projects..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-64"
                            />
                        </div>
                    </div>
                }
            />

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <span className="loading loading-spinner loading-lg text-indigo-600"></span>
                </div>
            ) : filteredCards.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                        <Icon name="Search" size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">No Rate Cards Found</h3>
                    <p className="text-slate-400 mt-2">Try adjusting your filters or contact an administrator.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredCards.map((card, idx) => (
                        <motion.div
                            key={card._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all group"
                        >
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">
                                        {card.projectName || "Global Rate Card"}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        Vendor: {card.vendorId} {card.projectId && `• Project ID: ${card.projectId}`}
                                    </p>
                                </div>
                                <div className="px-3 py-1 bg-white rounded-full border border-slate-100 text-[10px] font-black uppercase text-indigo-600 tracking-tighter shadow-sm">
                                    {card.status}
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="space-y-3">
                                    {card.rates.map((rate, rIdx) => (
                                        <div key={rIdx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:bg-slate-50 transition-colors">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{rate.role}</p>
                                                <p className="text-xs font-black text-slate-700 leading-none">{rate.experienceRange}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">₹{rate.rate} / {rate.unit}</p>
                                                <p className="text-[9px] text-slate-400 font-bold leading-none">Standard Rate</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Effective Dates</p>
                                        <p className="text-[11px] font-bold text-slate-600 mt-1">
                                            {new Date(card.effectiveFrom).toLocaleDateString()} 
                                            {card.effectiveTo ? ` — ${new Date(card.effectiveTo).toLocaleDateString()}` : ' (No Expiry)'}
                                        </p>
                                    </div>
                                    <button className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                                        <Icon name="ExternalLink" size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
