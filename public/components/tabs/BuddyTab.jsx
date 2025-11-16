const { useState, useEffect, useCallback } = React;
const { BuddyIcon } = window.AmilyIcons;

function BuddyTab({ userId = 'demo-user', authToken = null }) {
    const [lastHello, setLastHello] = useState(null);
    const [buddies, setBuddies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBuddies = useCallback(() => {
        const controller = new AbortController();
        const loadProfiles = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams();
                if (userId) {
                    params.set('excludeUserId', userId);
                }
                const query = params.toString();
                const response = await fetch(`/api/buddies${query ? `?${query}` : ''}`, {
                    headers: {
                        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                    },
                    signal: controller.signal,
                });
                let payload = null;
                try {
                    payload = await response.json();
                } catch {
                    payload = null;
                }
                if (!response.ok || !payload?.success) {
                    throw new Error(payload?.error || 'Unable to load nearby buddies.');
                }
                if (!controller.signal.aborted) {
                    setBuddies(Array.isArray(payload.data) ? payload.data : []);
                }
            } catch (fetchError) {
                if (controller.signal.aborted) return;
                console.warn('Unable to fetch buddy list', fetchError);
                setError(fetchError?.message || 'Unable to load nearby buddies right now.');
                setBuddies([]);
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };
        loadProfiles();
        return controller;
    }, [authToken, userId]);

    useEffect(() => {
        const controller = fetchBuddies();
        return () => controller.abort();
    }, [fetchBuddies]);

    return (
        <section className="relative px-4 py-16">
            <div className="mx-auto max-w-5xl space-y-10">
                <div className="rounded-[40px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#e6d3ff] bg-[#f7f2ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#7c4bc5]">
                        <BuddyIcon />
                        Buddy board
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold text-[#1f2330]">Meet neighbors with similar interests</h2>
                    <p className="mt-2 text-sm text-[#5f6675]">
                        Matches stay small and friendly. Elders can wave hello and families can quietly keep an eye on new companions.
                    </p>
                </div>

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="rounded-[32px] border border-dashed border-[#e6d3ff] bg-white/80 p-6 text-center text-sm text-[#5f6675]">
                            Gathering nearby friends...
                        </div>
                    ) : error ? (
                        <div className="rounded-[32px] border border-[#ffd5cc] bg-[#fff3ef] p-6 space-y-3 text-sm text-[#a6523b]">
                            <p>{error}</p>
                            <button
                                type="button"
                                onClick={fetchBuddies}
                                className="w-full sm:w-auto rounded-2xl bg-[#1f2330] px-4 py-2 text-sm font-semibold text-white shadow hover:-translate-y-0.5"
                            >
                                Try again
                            </button>
                        </div>
                    ) : buddies.length === 0 ? (
                        <div className="rounded-[32px] border border-white/70 bg-white/85 p-6 text-sm text-[#5f6675]">
                            No other users are visible yet. Check back soon as the circle grows.
                        </div>
                    ) : (
                        buddies.map((buddy) => (
                            <div
                                key={buddy.id}
                                className="rounded-[36px] border border-white/70 bg-gradient-to-br from-[#fdf4ff] via-white to-[#fff3f0] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] space-y-4"
                            >
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#7c4bc5]">
                                        {buddy.distance || 'Nearby'}
                                    </p>
                                    <h3 className="text-2xl font-semibold text-[#1f2330]">{buddy.name}</h3>
                                    <p className="text-sm text-[#5f6675]">Available: {buddy.availability || 'Shares schedule privately'}</p>
                                    {buddy.note && <p className="text-sm text-[#5f6675]">{buddy.note}</p>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(buddy.interests || ['Friendly chats']).map((interest) => (
                                        <span
                                            key={`${buddy.id || buddy.name}-${interest}`}
                                            className="rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm text-[#1f2330]"
                                        >
                                            {interest}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#a26e89]">
                                    <span className="rounded-full border border-[#f4d3b4] px-4 py-2">Care circle sees waves</span>
                                    <span className="rounded-full border border-[#f4d3b4] px-4 py-2">Voice ready</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}

window.AmilyTabs = window.AmilyTabs || {};
window.AmilyTabs.BuddyTab = BuddyTab;
