// Configuration
const API_URL = '/api';

// State
const state = {
    users: [],
    currentUser: null,
    workouts: [],
    timer: {
        interval: null,
        startTime: null,
        elapsedSeconds: 0,
        isRunning: false,
        isPaused: false
    }
};

// DOM Elements
const els = {
    screens: {
        home: document.getElementById('home-screen'),
        timer: document.getElementById('timer-screen'),
        explore: document.getElementById('explore-screen')
    },
    home: {
        userList: document.getElementById('user-list'),
        addUserBtn: document.getElementById('add-user-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        themeSun: document.querySelector('.sun-icon'),
        themeMoon: document.querySelector('.moon-icon'),
        modal: document.getElementById('add-user-modal'),
        cancelBtn: document.getElementById('cancel-user-btn'),
        saveBtn: document.getElementById('save-user-btn'),
        input: document.getElementById('new-username')
    },
    timer: {
        backBtn: document.getElementById('back-to-home'),
        userName: document.getElementById('current-user-name'),
        display: document.getElementById('time-display'),
        status: document.getElementById('status-indicator'),
        ringPath: document.getElementById('timer-ring-path'),
        startBtn: document.getElementById('start-btn'),
        pauseBtn: document.getElementById('pause-btn'),
        resumeBtn: document.getElementById('resume-btn'),
        stopBtn: document.getElementById('stop-btn'),
        exploreBtn: document.getElementById('explore-data-btn'),
        modal: document.getElementById('stop-modal'),
        cancelStopBtn: document.getElementById('cancel-stop-btn'),
        confirmStopBtn: document.getElementById('confirm-stop-btn')
    },
    explore: {
        backBtn: document.getElementById('back-to-timer'),
        list: document.getElementById('workout-list'),
        statsPanel: document.getElementById('stats-summary'),
        totalCount: document.getElementById('stat-total-count'),
        totalTime: document.getElementById('stat-total-time')
    },
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-message')
};

// Helpers
const showScreen = (screenId) => {
    Object.values(els.screens).forEach(screen => screen.classList.add('hidden'));
    els.screens[screenId].classList.remove('hidden');
    window.scrollTo(0, 0);
};

const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [
        h.toString().padStart(2, '0'),
        m.toString().padStart(2, '0'),
        s.toString().padStart(2, '0')
    ].join(':');
};

const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const showToast = (message) => {
    els.toastMsg.textContent = message;
    els.toast.classList.remove('hidden');
    setTimeout(() => els.toast.classList.add('hidden'), 3000);
};

// API Calls
const api = {
    getUsers: async () => {
        const res = await fetch(`${API_URL}/users`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        return data;
    },
    createUser: async (username) => {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create');
        return data;
    },
    getWorkouts: async (userId) => {
        const res = await fetch(`${API_URL}/workouts/${userId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        return data;
    },
    saveWorkout: async (workoutData) => {
        const res = await fetch(`${API_URL}/workouts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workoutData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');
        return data;
    },
    deleteWorkout: async (id) => {
        const res = await fetch(`${API_URL}/workouts/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete');
        return data;
    }
};

// Intialization & User Flow
const init = async () => {
    initThemeState();
    bindEvents();
    await loadUsers();
};

const initThemeState = () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
        els.home.themeSun.style.display = 'block';
        els.home.themeMoon.style.display = 'none';
    } else {
        els.home.themeSun.style.display = 'none';
        els.home.themeMoon.style.display = 'block';
    }
};

const loadUsers = async () => {
    try {
        state.users = await api.getUsers();
        renderUsers();
    } catch (e) {
        els.home.userList.innerHTML = '<p class="empty-state">Unable to load profiles. Check server connection.</p>';
        console.error(e);
    }
};

const renderUsers = () => {
    if (state.users.length === 0) {
        els.home.userList.innerHTML = `
            <div style="grid-column: 1/-1;" class="empty-state">
                <div class="empty-icon">👥</div>
                <p>No profiles found. Add one to begin.</p>
            </div>`;
        return;
    }
    
    els.home.userList.innerHTML = state.users.map(user => `
        <div class="user-tile" data-id="${user._id}">
            <div class="avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="user-name">${user.username}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.user-tile').forEach(tile => {
        tile.addEventListener('click', () => selectUser(tile.dataset.id));
    });
};

const selectUser = (userId) => {
    state.currentUser = state.users.find(u => u._id === userId);
    if (!state.currentUser) return;
    
    els.timer.userName.textContent = state.currentUser.username;
    
    // Reset timer
    resetTimer();
    showScreen('timer');
};

// Timer Logic
const runTimerLoop = () => {
    state.timer.elapsedSeconds++;
    updateTimerDisplay();
};

const updateTimerDisplay = () => {
    els.timer.display.textContent = formatTime(state.timer.elapsedSeconds);
    // update ring (max visual at 60 mins)
    const pct = (state.timer.elapsedSeconds % 3600) / 3600;
    els.timer.ringPath.style.strokeDashoffset = 283 - (283 * pct);
};

const resetTimer = () => {
    clearInterval(state.timer.interval);
    state.timer.elapsedSeconds = 0;
    state.timer.isRunning = false;
    state.timer.isPaused = false;
    state.timer.startTime = null;
    
    updateTimerDisplay();
    updateTimerUI();
    document.querySelector('.timer-ring').classList.remove('is-active', 'is-paused');
};

const updateTimerUI = () => {
    if (!state.timer.isRunning && !state.timer.isPaused) {
        // Initial state
        els.timer.startBtn.classList.remove('hidden');
        els.timer.pauseBtn.classList.add('hidden');
        els.timer.resumeBtn.classList.add('hidden');
        els.timer.stopBtn.style.opacity = '0.5';
        els.timer.stopBtn.style.pointerEvents = 'none';
        els.timer.status.textContent = 'Ready to track';
        document.querySelector('.timer-ring').classList.remove('is-active', 'is-paused');
    } else if (state.timer.isRunning && !state.timer.isPaused) {
        // Running state
        els.timer.startBtn.classList.add('hidden');
        els.timer.pauseBtn.classList.remove('hidden');
        els.timer.resumeBtn.classList.add('hidden');
        els.timer.stopBtn.style.opacity = '1';
        els.timer.stopBtn.style.pointerEvents = 'auto';
        els.timer.status.textContent = 'Workout in progress';
        document.querySelector('.timer-ring').classList.add('is-active');
        document.querySelector('.timer-ring').classList.remove('is-paused');
    } else if (state.timer.isPaused) {
        // Paused state
        els.timer.startBtn.classList.add('hidden');
        els.timer.pauseBtn.classList.add('hidden');
        els.timer.resumeBtn.classList.remove('hidden');
        els.timer.status.textContent = 'Paused';
        document.querySelector('.timer-ring').classList.remove('is-active');
        document.querySelector('.timer-ring').classList.add('is-paused');
    }
    
    // Change ring color based on state
    els.timer.ringPath.style.stroke = state.timer.isRunning && !state.timer.isPaused ? 'var(--success)' : 
                                      state.timer.isPaused ? 'var(--secondary)' : 'var(--primary)';
};

// Events mapping
const bindEvents = () => {
    // Theme toggle
    els.home.themeToggle.addEventListener('click', () => {
        const isCurrentlyLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (isCurrentlyLight) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
            els.home.themeSun.style.display = 'none';
            els.home.themeMoon.style.display = 'block';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            els.home.themeSun.style.display = 'block';
            els.home.themeMoon.style.display = 'none';
        }
    });

    // Users
    els.home.addUserBtn.addEventListener('click', () => els.home.modal.classList.remove('hidden'));
    els.home.cancelBtn.addEventListener('click', () => els.home.modal.classList.add('hidden'));
    els.home.saveBtn.addEventListener('click', async () => {
        const name = els.home.input.value.trim();
        if (!name) return;
        
        els.home.saveBtn.textContent = 'Saving...';
        els.home.saveBtn.disabled = true;
        try {
            await api.createUser(name);
            els.home.input.value = '';
            els.home.modal.classList.add('hidden');
            await loadUsers();
            showToast('Profile created!');
        } catch (e) {
            showToast('Error creating profile');
        }
        els.home.saveBtn.textContent = 'Save Profile';
        els.home.saveBtn.disabled = false;
    });
    
    // Timer controls
    els.timer.backBtn.addEventListener('click', () => {
        if (state.timer.isRunning || state.timer.isPaused) {
            showToast('Please stop the workout first');
            return;
        }
        showScreen('home');
    });
    
    els.timer.startBtn.addEventListener('click', () => {
        state.timer.isRunning = true;
        state.timer.startTime = new Date();
        state.timer.interval = setInterval(runTimerLoop, 1000);
        updateTimerUI();
    });
    
    els.timer.pauseBtn.addEventListener('click', () => {
        state.timer.isPaused = true;
        clearInterval(state.timer.interval);
        updateTimerUI();
    });
    
    els.timer.resumeBtn.addEventListener('click', () => {
        state.timer.isPaused = false;
        state.timer.interval = setInterval(runTimerLoop, 1000);
        updateTimerUI();
    });
    
    els.timer.stopBtn.addEventListener('click', () => {
        els.timer.modal.classList.remove('hidden');
    });
    
    els.timer.cancelStopBtn.addEventListener('click', () => {
        els.timer.modal.classList.add('hidden');
    });
    
    els.timer.confirmStopBtn.addEventListener('click', async () => {
        clearInterval(state.timer.interval);
        els.timer.modal.classList.add('hidden');
        
        // Save logic
        const endTime = new Date();
        const startStr = state.timer.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const endStr = endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const workoutData = {
            userId: state.currentUser._id,
            date: state.timer.startTime,
            startTime: startStr,
            endTime: endStr,
            totalDuration: state.timer.elapsedSeconds
        };
        
        try {
            await api.saveWorkout(workoutData);
            showToast('Workout saved successfully!');
        } catch (e) {
            showToast('Failed to save workout');
            console.error(e);
        }
        
        resetTimer();
    });
    
    // Explore
    els.timer.exploreBtn.addEventListener('click', async () => {
        if (state.timer.isRunning || state.timer.isPaused) {
            showToast('Please stop the workout first');
            return;
        }
        showScreen('explore');
        await loadWorkouts();
    });
    
    els.explore.backBtn.addEventListener('click', () => showScreen('timer'));
};

const loadWorkouts = async () => {
    els.explore.list.innerHTML = '<div class="loading-pulse"></div>';
    els.explore.statsPanel.classList.add('hidden');
    try {
        state.workouts = await api.getWorkouts(state.currentUser._id);
        renderWorkouts();
    } catch (e) {
        els.explore.list.innerHTML = '<p class="empty-state">Error loading data.</p>';
    }
};

const renderWorkouts = () => {
    if (state.workouts.length === 0) {
        els.explore.list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>No workouts recorded yet.</p>
                <p>Time to get sweating!</p>
            </div>`;
        els.explore.statsPanel.classList.add('hidden');
        return;
    }
    
    let totalTime = 0;
    
    els.explore.list.innerHTML = state.workouts.map(w => {
        totalTime += w.totalDuration;
        return `
        <div class="workout-card">
            <div class="workout-info">
                <div class="workout-date">${formatDate(w.date)}</div>
                <div class="workout-duration">${formatTime(w.totalDuration)}</div>
                <div class="workout-times">${w.startTime} - ${w.endTime}</div>
            </div>
            <button class="delete-btn" onclick="deleteWorkout('${w._id}')" aria-label="Delete">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
            </button>
        </div>
    `}).join('');
    
    // Update stats
    els.explore.statsPanel.classList.remove('hidden');
    els.explore.totalCount.textContent = state.workouts.length;
    els.explore.totalTime.textContent = Math.round((totalTime / 3600) * 10) / 10 + 'h';
};

window.deleteWorkout = async (id) => {
    if (!confirm('Delete this workout permanently?')) return;
    try {
        await api.deleteWorkout(id);
        showToast('Workout deleted');
        loadWorkouts();
    } catch (e) {
        showToast('Failed to delete');
    }
};

// Start
document.addEventListener('DOMContentLoaded', init);
