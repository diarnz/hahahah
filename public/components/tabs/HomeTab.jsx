const {
    SparklesIcon,
    ShieldIcon,
    ActivityIcon,
    MemorySparkIcon,
    BuddyIcon,
    ChatBubbleIcon,
    UsersIcon,
} = window.AmilyIcons;

function HomeTab({ onNavigate, features, FeatureCard }) {
    const highlightMetrics = [
        { value: '3.4k', label: 'Daily check-ins', detail: 'families in beta' },
        { value: '42s', label: 'Average response', detail: 'Gemini + ElevenLabs' },
        { value: '5 tabs', label: 'Muscle memory', detail: 'same order on every device' },
        { value: 'Zero feeds', label: 'Private by default', detail: 'only your care circle' },
    ];

    const previewTabs = [
        { icon: MemorySparkIcon, label: 'Memories', description: 'Record stories, generate artful covers.', colors: ['#ffe0d1', '#ffd6f2'] },
        { icon: ActivityIcon, label: 'Wellness', description: 'Hydration and movement as a profile card.', colors: ['#ffeccc', '#e4f6ff'] },
        { icon: ChatBubbleIcon, label: 'Chat', description: 'Voice-first, high contrast bubbles.', colors: ['#fcd8e1', '#ffeedf'] },
        { icon: ShieldIcon, label: 'Safety', description: 'Emergency tiles that auto-alert calmly.', colors: ['#f8d4cf', '#ffe9dd'] },
        { icon: BuddyIcon, label: 'Buddy', description: 'Nearby friends, shared hobbies, gentle waves.', colors: ['#e9e0ff', '#ffe0f0'] },
    ];

    const journey = [
        { title: 'Invite & orient', detail: 'Show the landing experience to family members first. Walk them through the five-tab orbit.' },
        { title: 'Sign in together', detail: 'Switch to full-screen calm mode with large inputs and autofilled names.' },
        { title: 'Let habits grow', detail: 'The same navigation positions on mobile, tablet, and smart displays to build trust.' },
    ];

    return (
        <div className="space-y-16 md:space-y-24 text-[#1f2330]">
            <section className="relative px-4 pt-12 md:pt-16">
                <div className="mx-auto grid max-w-6xl gap-8 lg:gap-10 lg:grid-cols-[1.2fr_minmax(0,0.9fr)]">
                    <div className="relative overflow-hidden rounded-[32px] md:rounded-[48px] border border-white/70 bg-white/85 p-6 sm:p-8 md:p-10 shadow-[0_35px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#fff5ec] via-transparent to-[#ffe5f4]" />
                        <div className="relative space-y-8">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#c26c52]">
                                <SparklesIcon />
                                Calm care OS
                            </span>
                            <div className="space-y-4">
                                <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight text-[#1f2330]">
                                    A gallery-like landing, a sanctuary-like app.
                                </h1>
                                <p className="text-base sm:text-lg text-[#5b6172]">
                                    Families explore the story-rich website. Elders transition into a simplified operating system that keeps the exact same tab order everywhere.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
                                <button
                                    type="button"
                                    onClick={() => onNavigate('login')}
                                    className="rounded-2xl bg-[#1f2330] px-6 py-3 text-sm font-semibold text-white shadow-[0_22px_50px_rgba(15,23,42,0.3)] transition hover:-translate-y-0.5"
                                >
                                    Sign in to continue
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onNavigate('signup')}
                                    className="rounded-2xl border border-[#d7c0ff] px-6 py-3 text-sm font-semibold text-[#7c4ac9] hover:bg-white/80"
                                >
                                    Create a family account
                                </button>
                            </div>
                            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                {highlightMetrics.map((item) => (
                                    <div key={item.label} className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-inner">
                                        <p className="text-3xl font-semibold">{item.value}</p>
                                        <p className="text-sm uppercase tracking-[0.35em] text-[#a06c58]">{item.label}</p>
                                        <p className="mt-1 text-sm text-[#5b6172]">{item.detail}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="relative mt-6 lg:mt-0">
                        <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-[rgba(255,214,204,0.7)] blur-[100px]" />
                        <div className="relative space-y-5 rounded-[42px] border border-white/70 bg-white/90 p-8 shadow-[0_30px_70px_rgba(15,23,42,0.12)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#db7758]">Live inside the app</p>
                                    <h3 className="text-2xl font-semibold">Five-tab orbit</h3>
                                </div>
                                <span className="rounded-full border border-[#d7f0e7] bg-[#f5fffa] px-4 py-1 text-xs font-semibold text-[#1f6d59]">
                                    Care mode
                                </span>
                            </div>
                            <div className="grid gap-4">
                                <div className="rounded-[30px] border border-white/80 bg-white/90 p-4 shadow">
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#bd7caa]">Suggested buddy</p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-lg font-semibold">Elli · watercolor walks</p>
                                            <p className="text-sm text-[#6c7280]">“Would you like to stroll by the lake this Sunday?”</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="rounded-full border border-[#f5d8cb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#c05f46]"
                                        >
                                            Wave back
                                        </button>
                                    </div>
                                </div>
                                <div className="rounded-[30px] border border-white/80 bg-[#fff8f1] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d46c4d]">Navigation order</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {['Memories', 'Wellness', 'Chat', 'Safety', 'Buddy'].map((label) => (
                                            <span
                                                key={label}
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${label === 'Chat' ? 'bg-[#1f2330] text-white' : 'bg-white text-[#1f2330]'}`}
                                            >
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-[#6c7280]">Same order on mobile tab bar, tablets, and TVs.</p>
                                </div>
                            </div>
                            <div className="rounded-[30px] border border-dashed border-[#f4d3b4] bg-[#fff9f3] p-4 text-sm text-[#6c7280]">
                                Chat sits in the middle to mimic old-school radio dials. Safety stays one tap to the right.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4">
                <div className="mx-auto max-w-6xl space-y-6 rounded-[32px] md:rounded-[40px] border border-white/70 bg-white/80 p-6 sm:p-8 shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
                    <div className="text-center space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#9f6ef2]">Tabs as rituals</p>
                        <h2 className="text-2xl md:text-3xl font-semibold">Every tile mirrors something elders already do</h2>
                        <p className="text-sm text-[#5b6172]">Tap once and the view fills the screen with large type, voice prompts, and optional audio.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {previewTabs.map((tab) => (
                            <div
                                key={tab.label}
                                className="rounded-[28px] border border-white/70 p-4 text-sm leading-relaxed shadow-sm"
                                style={{ backgroundImage: `linear-gradient(135deg, ${tab.colors[0]}, ${tab.colors[1]})` }}
                            >
                                <div className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-[#1f2330]">
                                    <tab.icon />
                                    <span className="font-semibold">{tab.label}</span>
                                </div>
                                <p className="mt-3 text-[#4a4f5e]">{tab.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4">
                <div className="mx-auto max-w-6xl space-y-8">
                    <div className="text-center space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#db7758]">Care interface</p>
                        <h2 className="text-2xl md:text-3xl font-semibold">What elders see after signing in</h2>
                        <p className="text-sm text-[#5b6172]">Every feature card below expands into a full-screen panel in the authenticated experience.</p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-3">
                        {features.map((feature) => (
                            <FeatureCard key={feature.title} {...feature} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 pb-20">
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_minmax(0,0.9fr)]">
                    <div className="space-y-4 rounded-[32px] md:rounded-[40px] border border-white/70 bg-white/80 p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#7f6ed6]">Gentle rollout</p>
                        <h3 className="text-2xl font-semibold">Simple steps toward calm support</h3>
                        <p className="text-sm text-[#5b6172]">
                            We stripped away extra dashboards. The process now feels like moving from a gallery to a living room.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {journey.map((step, index) => (
                                <div key={step.title} className="rounded-[28px] border border-white/80 bg-[#fff9f3] p-4">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1f2330] text-sm font-semibold text-white">
                                        {index + 1}
                                    </span>
                                    <h4 className="mt-3 text-lg font-semibold">{step.title}</h4>
                                    <p className="text-sm text-[#5b6172]">{step.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-[32px] md:rounded-[40px] border border-dashed border-[#f4d3b4] bg-[#fff9f3] p-6 sm:p-8 text-sm leading-relaxed text-[#5b6172]">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#d46c4d]">Care note</p>
                        <p className="mt-2">
                            Keep this landing page bookmarked on tablets around the house. When elders tap “Enter calm mode,” the entire viewport transforms
                            into the five-tab companion with large typography and optional voice prompts.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#a26e89]">
                            <span className="rounded-full border border-[#f4d3b4] px-4 py-2">Privacy sealed</span>
                            <span className="rounded-full border border-[#f4d3b4] px-4 py-2">Voice + touch</span>
                            <span className="rounded-full border border-[#f4d3b4] px-4 py-2">Care circle ready</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

window.AmilyTabs = window.AmilyTabs || {};
window.AmilyTabs.HomeTab = HomeTab;
