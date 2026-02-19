"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/Layout/PageHeader";
import { motion } from "framer-motion";

export default function VendorRateCards() {
    const { user } = useAuth();
    const [rateCards, setRateCards] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const res = await fetch('/api/vendor/rate-cards', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setRateCards(data.rateCards || []);
                }
            } catch (err) {
                console.error("Failed to fetch rate cards", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRates();
    }, []);

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
            <PageHeader
                title="My Rate Cards"
                subtitle="Your approved rates for projects and general services."
                icon="TrendingUp"
                accent="teal"
                roleLabel="Vendor"
            />

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <span className="loading loading-spinner loading-lg text-teal-600"></span>
                </div>
            ) : rateCards.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                        <Icon name="FileText" size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">No Rate Cards Assigned</h3>
                    <p className="text-slate-400 mt-2">Please contact your project manager or administrator.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rateCards.map((card, idx) => (
                        <motion.div
                            key={card._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all group"
                        >
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg group-hover:text-teal-600 transition-colors">
                                        {card.projectId ? `Project: ${card.projectName || card.projectId}` : 'Global Rate Card'}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        Active since {new Date(card.effectiveFrom).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                                    {card.status}
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {card.rates.map((rate, rIdx) => (
                                        <div key={rIdx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{rate.role}</p>
                                                <p className="text-sm font-black text-slate-700 leading-none">{rate.experienceRange}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-slate-900 leading-none mb-1">₹{rate.rate}</p>
                                                <p className="text-[10px] text-teal-600 font-black uppercase tracking-widest leading-none">Per {rate.unit.toLowerCase()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500">
                                    <span className="flex items-center gap-1.5"><Icon name="ShieldCheck" size={14} /> Verified Rate</span>
                                    <span>{card.effectiveTo ? `Expires: ${new Date(card.effectiveTo).toLocaleDateString()}` : 'No Expiry Set'}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
