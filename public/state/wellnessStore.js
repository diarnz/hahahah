(() => {
  if (typeof window === 'undefined') return;

  const STORAGE_KEY = 'amily-wellness';
  const DEFAULT_USER = 'demo-user';
  const todayKey = () => new Date().toISOString().slice(0, 10);

  const defaultUserState = () => ({
    hydration: 0,
    dailyGoal: 6,
    lastDrink: null,
    lastReset: todayKey(),
  });

  const defaultRootState = () => ({
    activeUserId: DEFAULT_USER,
    users: {
      [DEFAULT_USER]: defaultUserState(),
    },
  });

  const migrateLegacyState = (legacy) => {
    const userState = {
      ...defaultUserState(),
      ...legacy,
    };
    return {
      activeUserId: DEFAULT_USER,
      users: {
        [DEFAULT_USER]: userState,
      },
    };
  };

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultRootState();
      const parsed = JSON.parse(raw);
      if (parsed && parsed.users) {
        return {
          ...defaultRootState(),
          ...parsed,
          users: {
            ...defaultRootState().users,
            ...parsed.users,
          },
        };
      }
      if (parsed && typeof parsed === 'object') {
        return migrateLegacyState(parsed);
      }
    } catch {
      /* noop */
    }
    return defaultRootState();
  };

  const state = loadState();

  const ensureUser = (userId = DEFAULT_USER) => {
    if (!state.users[userId]) {
      state.users[userId] = defaultUserState();
    }
    return state.users[userId];
  };

  const getActiveUser = () => ensureUser(state.activeUserId);

  const persist = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activeUserId: state.activeUserId,
          users: state.users,
        })
      );
    } catch (error) {
      console.warn('Unable to persist wellness state', error);
    }
  };

  const broadcast = () => {
    const userState = getActiveUser();
    window.dispatchEvent(
      new CustomEvent('amily:hydration:update', {
        detail: {
          userId: state.activeUserId,
          hydration: userState.hydration,
          dailyGoal: userState.dailyGoal,
          lastDrink: userState.lastDrink,
        },
      })
    );
  };

  const resetIfNeeded = (userState) => {
    if (userState.lastReset !== todayKey()) {
      userState.hydration = 0;
      userState.lastDrink = null;
      userState.lastReset = todayKey();
    }
  };

  const clampHydration = (userState) => {
    userState.hydration = Math.max(0, Math.min(userState.dailyGoal, userState.hydration));
  };

  Object.values(state.users).forEach((userState) => {
    resetIfNeeded(userState);
    clampHydration(userState);
  });

  const adjustHydration = (delta = 1) => {
    if (!delta) return;
    const userState = getActiveUser();
    userState.hydration += delta;
    clampHydration(userState);
    userState.lastDrink = new Date().toISOString();
    persist();
    broadcast();
  };

  const setUser = (userId = DEFAULT_USER) => {
    state.activeUserId = userId || DEFAULT_USER;
    const userState = getActiveUser();
    resetIfNeeded(userState);
    clampHydration(userState);
    persist();
    broadcast();
  };

  window.AmilyWellness = window.AmilyWellness || {};
  window.AmilyWellness.getHydration = () => getActiveUser().hydration;
  window.AmilyWellness.getDailyGoal = () => getActiveUser().dailyGoal;
  window.AmilyWellness.getLastDrink = () => getActiveUser().lastDrink;
  window.AmilyWellness.getActiveUserId = () => state.activeUserId;
  window.AmilyWellness.setUser = setUser;
  window.AmilyWellness.adjustHydration = adjustHydration;
  window.AmilyWellness.resetHydration = () => {
    const userState = getActiveUser();
    userState.hydration = 0;
    userState.lastDrink = null;
    userState.lastReset = todayKey();
    persist();
    broadcast();
  };
  window.AmilyWellness.setHydrationGoal = (goal = 6) => {
    if (!Number.isFinite(goal) || goal <= 0) return;
    const userState = getActiveUser();
    userState.dailyGoal = Math.max(1, Math.round(goal));
    clampHydration(userState);
    persist();
    broadcast();
  };

  broadcast();
})();

