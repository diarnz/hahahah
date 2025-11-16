const { useState, useEffect, useCallback } = React;
const { ActivityIcon, WellnessLeafIcon } = window.AmilyIcons;

const resolveTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
};

const priorityToStatus = {
    high: 'low',
    medium: 'notice',
    low: 'ok',
};

const formatNudgeLabel = (type) => {
    switch (type) {
        case 'medication':
            return 'Medication';
        case 'hydration':
            return 'Hydration';
        case 'activity':
            return 'Movement';
        case 'weather':
            return 'Weather care';
        case 'rest':
            return 'Rest';
        default:
            return 'Daily note';
    }
};

const getMoodSnapshot = (status, current, goal) => {
    if (status === 'ok') {
        return {
            value: 'Calm & steady',
            tip: `Already ${current} of ${goal} glasses logged today.`,
            status: 'ok',
        };
    }
    if (status === 'notice') {
        return {
            value: 'Energy dipping a little',
            tip: `Only ${current} of ${goal} glasses so far. A small glass would help.`,
            status: 'notice',
        };
    }
    return {
        value: 'Needs a pause',
        tip: `Hydration still at ${current} / ${goal}. Let's sip water before the next activity.`,
        status: 'low',
    };
};

const formatTimestamp = (value) => {
    if (!value) return null;
    try {
        return new Date(value).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return null;
    }
};

const getNameInitials = (name) => {
    if (!name) return 'AP';
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0]?.toUpperCase())
        .join('')
        .slice(0, 2) || 'AP';
};

function WellnessTab({ userId = 'demo-user', authToken = null, userName = 'Companion friend' }) {
    const resolvedName = (userName || '').trim() || 'Companion friend';
    const profile = {
        name: resolvedName,
        initials: getNameInitials(resolvedName),
        age: 78,
        city: 'Espoo',
        note: 'Prefers afternoon chats and short morning walks whenever the paths are dry.',
    };

    const wellnessStore = window.AmilyWellness;
    const getHydrationSnapshot = () => ({
        goal: wellnessStore?.getDailyGoal?.() ?? 6,
        current: wellnessStore?.getHydration?.() ?? 0,
        lastDrink: wellnessStore?.getLastDrink?.() ?? null,
    });
    const [hydration, setHydration] = useState(getHydrationSnapshot);
    const [nudges, setNudges] = useState([]);
    const [isFetchingNudges, setIsFetchingNudges] = useState(false);
    const [nudgesError, setNudgesError] = useState(null);
    const [lastSync, setLastSync] = useState(null);

    useEffect(() => {
        if (wellnessStore?.setUser) {
            wellnessStore.setUser(userId || 'demo-user');
        }
        setHydration(getHydrationSnapshot());
    }, [userId]);

    useEffect(() => {
        const handleUpdate = (event) => {
            const detail = event.detail || {};
            if (detail.userId && detail.userId !== (userId || 'demo-user')) {
                return;
            }
            setHydration((prev) => ({
                goal: detail.dailyGoal ?? prev.goal,
                current: detail.hydration ?? prev.current,
                lastDrink: detail.lastDrink ?? prev.lastDrink,
            }));
        };
        window.addEventListener('amily:hydration:update', handleUpdate);
        return () => window.removeEventListener('amily:hydration:update', handleUpdate);
    }, [userId]);

    const hydrationPercent = Math.min(
        100,
        Math.round(((hydration.current || 0) / (hydration.goal || 1)) * 100)
    );
    const hydrationDegrees = Math.min(360, Math.max(0, Math.round((hydrationPercent / 100) * 360)));
    const glassesRemaining = Math.max(0, (hydration.goal || 0) - (hydration.current || 0));
    const hydrationStatus =
        hydration.current >= hydration.goal
            ? 'ok'
            : hydration.current <= 2
            ? 'low'
            : 'notice';
    const moodSnapshot = getMoodSnapshot(hydrationStatus, hydration.current || 0, hydration.goal || 0);
    const timeOfDay = resolveTimeOfDay();
    const moodParam = hydrationStatus === 'ok' ? 'good' : hydrationStatus === 'notice' ? 'ok' : 'low';

    const fetchWellnessNudges = useCallback(
        async ({ signal } = {}) => {
            if (typeof window === 'undefined') return;
            const activeUserId = wellnessStore?.getActiveUserId?.() || userId || 'demo-user';
            setIsFetchingNudges(true);
            setNudgesError(null);
            try {
                const params = new URLSearchParams({
                    userId: activeUserId,
                    timeOfDay,
                    mood: moodParam,
                });
                const response = await fetch(`/api/wellness/nudges?${params.toString()}`, {
                    headers: {
                        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                    },
                    signal,
                });
                let payload = null;
                try {
                    payload = await response.json();
                } catch {
                    payload = null;
                }
                if (!response.ok || !payload?.success) {
                    throw new Error(payload?.error || 'Unable to load suggestions right now.');
                }
                if (signal?.aborted) return;
                const list = Array.isArray(payload.data) ? payload.data : [];
                setNudges(list);
                setLastSync(payload.timestamp || new Date().toISOString());
            } catch (error) {
                if (signal?.aborted) return;
                console.warn('Unable to load wellness nudges', error);
                setNudges([]);
                setNudgesError(error?.message || 'Unable to load suggestions.');
            } finally {
                if (!signal?.aborted) {
                    setIsFetchingNudges(false);
                }
            }
        },
        [authToken, moodParam, timeOfDay, userId]
    );

    useEffect(() => {
        const controller = new AbortController();
        fetchWellnessNudges({ signal: controller.signal });
        return () => controller.abort();
    }, [fetchWellnessNudges]);

    const logHydrationToServer = (amount = 1) => {
        fetch('/api/wellness/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({
                userId: userId || 'demo-user',
                type: 'water',
                value: amount,
            }),
        }).catch(() => {
            // Non-blocking demo mode
        });
    };

    const handleManualHydration = () => {
        const activeUser = userId || 'demo-user';
        wellnessStore?.setUser?.(activeUser);
        wellnessStore?.adjustHydration?.(1);
        setHydration(getHydrationSnapshot());
        logHydrationToServer(1);
    };

    const handleRefreshNudges = () => {
        fetchWellnessNudges();
    };

    const lastDrinkLabel = formatTimestamp(hydration.lastDrink);
    const lastSyncLabel = formatTimestamp(lastSync);

    const hydrationNudge = nudges.find((nudge) => nudge.type === 'hydration');
    const medicationNudge = nudges.find((nudge) => nudge.type === 'medication');
    const activityNudge = nudges.find((nudge) => nudge.type === 'activity');
    const weatherNudge = nudges.find((nudge) => nudge.type === 'weather');

    const hydrationTip =
        hydrationNudge?.message ||
        (hydration.current >= hydration.goal
            ? 'Goal met – sip warm tea if you like.'
            : glassesRemaining === 1
            ? 'Just one more gentle glass.'
            : `${glassesRemaining} more to feel refreshed.`);

    const wellnessAreas = [
        {
            label: 'Mood today',
            value: moodSnapshot.value,
            status: moodSnapshot.status,
            tip: moodSnapshot.tip,
        },
        {
            label: 'Hydration',
            value: `${hydration.current} of ${hydration.goal} glasses`,
            status: hydrationStatus,
            tip: hydrationTip,
        },
        medicationNudge
            ? {
                  label: 'Medication',
                  value: medicationNudge.message,
                  status: priorityToStatus[medicationNudge.priority] || 'notice',
                  tip: medicationNudge.action ? `Suggested action: ${medicationNudge.action}` : null,
              }
            : null,
        activityNudge
            ? {
                  label: 'Movement',
                  value: activityNudge.message,
                  status: priorityToStatus[activityNudge.priority] || 'notice',
                  tip: activityNudge.action ? `Suggested action: ${activityNudge.action}` : 'Walk near the window for sunlight.',
              }
            : null,
        weatherNudge
            ? {
                  label: 'Weather care',
                  value: weatherNudge.message,
                  status: priorityToStatus[weatherNudge.priority] || 'notice',
                  tip: weatherNudge.action || "Plan outfits with today's forecast in mind.",
              }
            : null,
    ].filter(Boolean);

    const formattedNudges = nudges.map((nudge, idx) => ({
        id: `${nudge.type}-${idx}`,
        label: formatNudgeLabel(nudge.type),
        message: nudge.message,
        priority: nudge.priority || 'medium',
        action: nudge.action,
        value: null,
    }));

    const fallbackSuggestions = wellnessAreas
        .filter((area) => area.status !== 'ok')
        .map((area) => ({
            id: `fallback-${area.label}`,
            label: area.label,
            message: area.tip || area.value,
            priority: area.status === 'low' ? 'high' : 'medium',
            value: area.value,
        }));

    const suggestionCards = formattedNudges.length ? formattedNudges : fallbackSuggestions;
    const priorityBadgeClass = {
        high: 'bg-[#fde4dc] text-[#b24327]',
        medium: 'bg-[#fff1e7] text-[#c26345]',
        low: 'bg-[#f7efe6] text-[#8a6b5a]',
    };

    return (
        <section className="relative px-4 py-16">
            <div className="mx-auto max-w-6xl space-y-8">
                <div className="rounded-[40px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#d4e9ff] bg-[#f4f8ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#5277c5]">
                        <ActivityIcon />
                        Personal wellness
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold text-[#1f2330]">Profile-style wellness view</h2>
                    <p className="mt-2 text-sm text-[#5f6675]">
                        No charts. No gamified streaks. Just a single card with the handful of numbers that help elders feel steady every day.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
                    <div className="space-y-6 rounded-[40px] border border-white/70 bg-white/85 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#ffe9de] text-3xl font-semibold text-[#db7758]">
                                    {profile.initials}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-semibold text-[#1f2330]">{profile.name}</h3>
                                    <p className="text-sm text-[#5f6675]">
                                        {profile.age} · {profile.city}
                                    </p>
                                    <p className="mt-1 text-sm text-[#5f6675]">{profile.note}</p>
                                </div>
                            </div>
                            <div className="rounded-full border border-[#c7efd8] bg-[#f2fbf6] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#1f6d59]">
                                Calm mode active
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[0.9fr_minmax(0,1.1fr)]">
                            <div className="rounded-[32px] border border-[#ffe2d2] bg-[#fff8f3] p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#d46c4d]">Hydration</p>
                                        <p className="text-lg font-semibold text-[#1f2330]">
                                            {hydration.current} / {hydration.goal} glasses
                                        </p>
                                        <p className="text-sm text-[#5f6675]">
                                            {hydration.current >= hydration.goal
                                                ? 'Goal met – warm tea optional'
                                                : `${glassesRemaining} glasses to go today.`}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleManualHydration}
                                        className="rounded-2xl bg-[#1f2330] px-4 py-2 text-xs font-semibold text-white shadow hover:-translate-y-0.5"
                                    >
                                        + Log
                                    </button>
                                </div>
                                <div className="mt-6 flex items-center justify-center">
                                    <div className="relative h-40 w-40">
                                        <div
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                background: `conic-gradient(#db7758 ${hydrationDegrees}deg, rgba(247,214,198,0.6) ${hydrationDegrees}deg)`,
                                            }}
                                        />
                                        <div className="absolute inset-4 rounded-full border border-white/80 bg-white flex flex-col items-center justify-center text-center">
                                            <p className="text-2xl font-semibold text-[#1f2330]">{hydrationPercent}%</p>
                                            <p className="text-xs uppercase tracking-[0.35em] text-[#bd7c6c]">Today</p>
                                            {lastDrinkLabel && <p className="mt-1 text-[11px] text-[#5f6675]">Last sip {lastDrinkLabel}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 rounded-[32px] border border-white/70 bg-white/80 p-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {wellnessAreas.map((area) => (
                                        <div key={area.label} className="rounded-2xl border border-[#f5e3d9] bg-[#fffaf6] p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#c05f46]">{area.label}</p>
                                            <p className="text-lg font-semibold text-[#1f2330]">{area.value}</p>
                                            {area.tip && <p className="text-sm text-[#5f6675]">{area.tip}</p>}
                                        </div>
                                    ))}
                                </div>
                                <div className="rounded-2xl border border-dashed border-[#f4d3b4] bg-[#fff9f3] p-4 text-sm text-[#5f6675]">
                                    Caregivers screenshot or export this view; it doubles as a wellness passport.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[40px] border border-white/70 bg-white/85 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-[#ffe8dd] p-3 text-[#db7758]">
                                    <WellnessLeafIcon />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#db7758]">Recommendations</p>
                                    <h4 className="text-xl font-semibold text-[#1f2330]">Only when needed</h4>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5f6675]">
                                {lastSyncLabel && <span>Synced {lastSyncLabel}</span>}
                                <button
                                    type="button"
                                    onClick={handleRefreshNudges}
                                    disabled={isFetchingNudges}
                                    className={`rounded-2xl border border-[#f4d3b4] px-4 py-2 font-semibold text-[#c05f46] ${
                                        isFetchingNudges ? 'opacity-60' : 'hover:bg-[#fff4ef]'
                                    }`}
                                >
                                    {isFetchingNudges ? 'Refreshing…' : 'Refresh'}
                                </button>
                            </div>
                        </div>

                        {isFetchingNudges ? (
                            <div className="mt-6 rounded-[28px] border border-dashed border-[#f4d3b4] bg-[#fff8f3] p-4 text-sm text-[#5f6675]">
                                Checking for new suggestions…
                            </div>
                        ) : suggestionCards.length === 0 ? (
                            <p className="mt-6 text-sm text-[#5f6675]">
                                {nudgesError
                                    ? `Unable to reach the wellness service (${nudgesError}).`
                                    : 'Everything looks steady today. Enjoy a calm chat or record a new memory.'}
                            </p>
                        ) : (
                            <div className="mt-6 space-y-4">
                                {suggestionCards.map((card) => (
                                    <div key={card.id} className="rounded-[28px] border border-[#ffe2d2] bg-[#fffaf6] p-4">
                                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-[#c05f46]">
                                            <span>{card.label}</span>
                                            <span
                                                className={`rounded-full px-3 py-1 text-[10px] ${
                                                    priorityBadgeClass[card.priority] || priorityBadgeClass.low
                                                }`}
                                            >
                                                {card.priority === 'high' ? 'Needs attention' : card.priority === 'medium' ? 'Reminder' : 'FYI'}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-[#1f2330]">{card.message}</p>
                                        {card.action && <p className="text-sm text-[#5f6675]">Suggested action: {card.action}</p>}
                                        {card.value && <p className="text-sm text-[#5f6675]">Current status: {card.value}</p>}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-6 rounded-[28px] border border-dashed border-[#d4e9ff] bg-[#f4f8ff] p-4 text-xs font-semibold uppercase tracking-[0.35em] text-[#5f6fb3]">
                            Stored locally · Synced only when the care team asks
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

window.AmilyTabs = window.AmilyTabs || {};
window.AmilyTabs.WellnessTab = WellnessTab;
