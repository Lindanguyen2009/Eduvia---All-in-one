/* ----------------------------------------------------
   1. LOCAL STORAGE SYSTEM (Personal Data on Browser)
   ---------------------------------------------------- */
let memoryFallback = {};
const Storage = {
    save: (key, data) => {
        try { localStorage.setItem(`eduvia_v1_${key}`, JSON.stringify(data)); } 
        catch (e) { memoryFallback[key] = data; }
    },
    load: (key) => {
        try { 
            const data = localStorage.getItem(`eduvia_v1_${key}`); 
            return data ? JSON.parse(data) : null; 
        } catch (e) { return memoryFallback[key] || null; }
    },
    initDefaults: () => {
        // Hỗ trợ tự động chuyển dữ liệu cũ từ plannery_v2 nếu có
        const oldUser = localStorage.getItem('plannery_v2_user');
        const oldTasks = localStorage.getItem('plannery_v2_tasks');
        const oldDecks = localStorage.getItem('plannery_v2_decks');

        if (!Storage.load('user')) { 
            let initialUser = { name: 'Nhà Thám Hiểm', totalXp: 0, streak: 0, bestStreak: 0, completedTasks: 0 };
            if (oldUser) {
                try {
                    const parsed = JSON.parse(oldUser);
                    initialUser.name = parsed.name || 'Nhà Thám Hiểm';
                    initialUser.totalXp = (parsed.level ? (parsed.level - 1) * 250 : 0) + (parsed.xp || 0);
                    initialUser.streak = parsed.streak || 0;
                    initialUser.bestStreak = parsed.bestStreak || parsed.streak || 0;
                } catch(e){}
            }
            Storage.save('user', initialUser); 
        }

        if (!Storage.load('tasks')) {
            let initialTasks = [];
            if (oldTasks) {
                try { initialTasks = JSON.parse(oldTasks) || []; } catch(e){}
            }
            Storage.save('tasks', initialTasks);
        }

        if (!Storage.load('decks')) {
            let initialDecks = [];
            if (oldDecks) {
                try { initialDecks = JSON.parse(oldDecks) || []; } catch(e){}
            }
            Storage.save('decks', initialDecks);
        }

        if (!Storage.load('reacted_confessions')) {
            Storage.save('reacted_confessions', []);
        }
    }
};
Storage.initDefaults();

/* ----------------------------------------------------
   2. 5-TIER RPG LEVELING SYSTEM (GAMIFICATION)
   Thứ tự theo yêu cầu: Lãnh đạo -> Gan dạ -> Bản lĩnh -> Tự tin -> Quyết đoán
   ---------------------------------------------------- */
const LevelSystem = {
    // 5 cấp độ với XP lũy tiến
    tiers: [
        { level: 1, name: 'Lãnh đạo', badge: '👑', xpNeeded: 250, desc: 'Khởi xướng hành trình, dẫn lối tương lai.' },
        { level: 2, name: 'Gan dạ', badge: '🦁', xpNeeded: 600, desc: 'Dám đương đầu bài khó, kiên cường vượt ải.' },
        { level: 3, name: 'Bản lĩnh', badge: '🛡️', xpNeeded: 1200, desc: 'Kỷ luật vững vàng, không ngại thử thách.' },
        { level: 4, name: 'Tự tin', badge: '⚡', xpNeeded: 2200, desc: 'Làm chủ tri thức, bứt phá mọi giới hạn.' },
        { level: 5, name: 'Quyết đoán', badge: '🌟', xpNeeded: 4000, desc: 'Bậc thầy học tập, định hình đỉnh cao tối thượng.' }
    ],

    getInfo: (totalXp = 0) => {
        let accumulated = 0;
        for (let i = 0; i < LevelSystem.tiers.length; i++) {
            const tier = LevelSystem.tiers[i];
            const nextThreshold = accumulated + tier.xpNeeded;
            if (totalXp < nextThreshold || i === LevelSystem.tiers.length - 1) {
                const currentTierXp = totalXp - accumulated;
                const percent = Math.min(100, Math.round((currentTierXp / tier.xpNeeded) * 100));
                const remaining = Math.max(0, tier.xpNeeded - currentTierXp);
                const nextTier = LevelSystem.tiers[i + 1] ? LevelSystem.tiers[i + 1].name : 'Cực Hạn';
                return {
                    tierIndex: i,
                    tier: tier,
                    currentTierXp,
                    percent,
                    remaining,
                    nextTier,
                    isMax: i === LevelSystem.tiers.length - 1
                };
            }
            accumulated += tier.xpNeeded;
        }
    },

    addXp: (amount) => {
        const user = Storage.load('user') || { name: 'Nhà Thám Hiểm', totalXp: 0 };
        const prevInfo = LevelSystem.getInfo(user.totalXp || 0);
        user.totalXp = (user.totalXp || 0) + amount;
        Storage.save('user', user);

        const newInfo = LevelSystem.getInfo(user.totalXp);
        if (newInfo.tier.level > prevInfo.tier.level) {
            // Chúc mừng thăng cấp
            alert(`🎉 CHÚC MỪNG! Bạn đã thăng cấp thành "${newInfo.tier.badge} ${newInfo.tier.name}"!`);
        }
        updateUserInfo();
    }
};

/* ----------------------------------------------------
   3. NAVIGATION & USER PROFILE
   ---------------------------------------------------- */
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) { target.classList.add('active'); }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-view') === viewId) { 
            btn.classList.add('active'); 
        } else { 
            btn.classList.remove('active'); 
        }
    });

    const fab = document.getElementById('fab-add-task');
    if (fab) { fab.style.display = viewId === 'planner' ? 'flex' : 'none'; }

    // Tự động tải lại tâm sự khi mở tab confessions
    if (viewId === 'confessions') {
        loadConfessionsFromServer();
    }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => { 
        const viewId = btn.getAttribute('data-view'); 
        switchView(viewId); 
    });
});

function updateUserInfo() {
    let user = Storage.load('user');
    if (!user) { 
        user = { name: 'Nhà Thám Hiểm', totalXp: 0, streak: 0, bestStreak: 0 }; 
        Storage.save('user', user);
    }

    const info = LevelSystem.getInfo(user.totalXp || 0);

    // Navbar Widgets (Desktop & Unified Combo Pill)
    const navRankBadge = document.getElementById('nav-rank-badge');
    const navRankName = document.getElementById('nav-rank-name');
    const navXpMini = document.getElementById('nav-xp-mini');
    const displayName = document.getElementById('display-user-name');
    const streakCount = document.getElementById('streak-count');
    const streakFire = document.getElementById('streak-fire');

    if (navRankBadge) navRankBadge.textContent = info.tier.badge;
    if (navRankName) navRankName.textContent = info.tier.name;
    if (navXpMini) navXpMini.textContent = `${info.currentTierXp} / ${info.tier.xpNeeded} XP`;
    if (displayName) displayName.textContent = user.name || 'Nhà Thám Hiểm';
    
    if (streakCount) streakCount.textContent = user.streak || 0;
    if (streakFire) streakFire.style.filter = (user.streak || 0) > 0 ? "none" : "grayscale(100%)";

    // Mobile Ribbon & Mobile Badges
    const mobDisplayName = document.getElementById('mobile-display-name');
    const mobRankBadge = document.getElementById('mobile-rank-badge');
    const mobRankName = document.getElementById('mobile-rank-name');
    const mobXpMini = document.getElementById('mobile-xp-mini');
    const mobNavBadge = document.getElementById('mobile-nav-rank-badge');
    const mobStreakCount = document.getElementById('mobile-streak-count');
    const mobStreakFire = document.getElementById('mobile-streak-fire');

    if (mobDisplayName) mobDisplayName.textContent = user.name || 'Bạn Học Vũ Trụ';
    if (mobStreakCount) mobStreakCount.textContent = user.streak || 0;
    if (mobStreakFire) mobStreakFire.style.filter = (user.streak || 0) > 0 ? "none" : "grayscale(100%)";
    if (mobRankBadge) mobRankBadge.textContent = info.tier.badge;
    if (mobRankName) mobRankName.textContent = info.tier.name;
    if (mobXpMini) mobXpMini.textContent = `(${info.currentTierXp}/${info.tier.xpNeeded} XP)`;
    if (mobNavBadge) mobNavBadge.textContent = info.tier.badge;

    // Dashboard Journey Card
    const dashRankAvatar = document.getElementById('dash-rank-avatar');
    const dashRankName = document.getElementById('dash-rank-name');
    const dashRankDesc = document.getElementById('dash-rank-desc');
    const dashTotalXp = document.getElementById('dash-total-xp');
    const dashXpFill = document.getElementById('dash-xp-fill');
    const dashXpProgress = document.getElementById('dash-xp-progress-text');
    const dashXpRemaining = document.getElementById('dash-xp-remaining-text');
    const stepperFill = document.getElementById('stepper-line-fill');

    if (dashRankAvatar) dashRankAvatar.textContent = info.tier.badge;
    if (dashRankName) dashRankName.textContent = `${info.tier.badge} ${info.tier.name}`;
    if (dashRankDesc) dashRankDesc.textContent = info.tier.desc;
    if (dashTotalXp) dashTotalXp.textContent = `${user.totalXp || 0} XP`;
    if (dashXpFill) dashXpFill.style.width = `${info.percent}%`;
    if (dashXpProgress) dashXpProgress.textContent = `${info.currentTierXp} / ${info.tier.xpNeeded} XP (${info.percent}%)`;
    if (dashXpRemaining) {
        dashXpRemaining.textContent = info.isMax 
            ? 'Đã đạt cấp bậc tối thượng!' 
            : `Cần thêm ${info.remaining} XP để thăng hạng "${info.nextTier}"`;
    }

    // Cập nhật các bước trên Stepper (5 Cấp)
    for (let i = 1; i <= 5; i++) {
        const stepEl = document.getElementById(`tier-step-${i}`);
        if (stepEl) {
            stepEl.classList.remove('active', 'completed');
            if (i - 1 < info.tierIndex) {
                stepEl.classList.add('completed');
            } else if (i - 1 === info.tierIndex) {
                stepEl.classList.add('active');
            }
        }
    }
    if (stepperFill) {
        const fillPercent = (info.tierIndex / 4) * 100;
        stepperFill.style.width = `${fillPercent}%`;
    }
}

window.editUserName = function() {
    const user = Storage.load('user') || {};
    const newName = prompt('Nhập biệt danh học tập mới của bạn:', user.name || 'Nhà Thám Hiểm');
    if (newName && newName.trim()) {
        user.name = newName.trim();
        Storage.save('user', user);
        updateUserInfo();
        window.updateDashboardStats();
    }
};

window.updateDashboardStats = function() {
    const user = Storage.load('user') || {};
    const tasks = Storage.load('tasks') || [];
    const pendingTasks = tasks.filter(t => t.status !== 'done').length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const totalTasks = tasks.length;

    const hour = new Date().getHours();
    let timeGreeting = "Chào buổi sáng";
    if (hour >= 12 && hour < 18) timeGreeting = "Chào buổi chiều";
    else if (hour >= 18 || hour < 5) timeGreeting = "Chào buổi tối";

    const nameStr = user.name || "Nhà Thám Hiểm";
    const h2 = document.getElementById('dash-greeting-h2');
    if (h2) { h2.innerHTML = `${timeGreeting}, ${nameStr}! ✨`; }

    const dashP = document.getElementById('dash-greeting-p');
    if (dashP) dashP.textContent = `Hôm nay bạn có ${pendingTasks} việc cần hoàn thành.`;

    const taskDesc = document.getElementById('dash-task-desc');
    if (taskDesc) taskDesc.textContent = `${pendingTasks} việc`;

    const decks = Storage.load('decks') || [];
    const deckDesc = document.getElementById('dash-deck-desc');
    if (deckDesc) deckDesc.textContent = `${decks.length} chủ đề`;

    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    const elRate = document.getElementById('stat-tasks');
    if (elRate) elRate.textContent = `${completionRate}%`;

    const elCompleted = document.getElementById('stat-completed-tasks');
    if (elCompleted) elCompleted.textContent = completedTasks;

    const bestStreak = user.bestStreak || user.streak || 0;
    const elBest = document.getElementById('stat-best-streak');
    if (elBest) elBest.innerHTML = `${bestStreak} <span style="font-size: 16px;">ngày</span>`;
};

/* ----------------------------------------------------
   4. PLANNER & TASKS
   ---------------------------------------------------- */
window.closeModals = () => { 
    document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none'); 
};

const Planner = {
    renderTasks: () => {
        const tasks = Storage.load('tasks') || []; 
        const container = document.getElementById('planner-list-container'); 
        if (!container) return;
        
        window.updateDashboardStats();
        container.innerHTML = '<div class="task-list"></div>'; 
        const taskList = container.querySelector('.task-list');
        
        const year = PlannerCalendar.selectedDate.getFullYear();
        const month = (PlannerCalendar.selectedDate.getMonth() + 1).toString().padStart(2, '0');
        const day = PlannerCalendar.selectedDate.getDate().toString().padStart(2, '0');
        const selectedDateStr = `${year}-${month}-${day}`;

        const filteredTasks = tasks.filter(t => t.deadline === selectedDateStr && t.status !== 'done');
        
        if (filteredTasks.length === 0) { 
            taskList.innerHTML = `<p style="text-align:center; color:var(--clr-text-muted); margin-top:30px;">🎉 Thật tuyệt! Không có nhiệm vụ nào tồn đọng cho ngày ${day}/${month}. Nhấn dấu (+) để lên kế hoạch mới!</p>`; 
        }

        filteredTasks.forEach(task => {
            const row = document.createElement('div'); 
            row.className = 'task-row'; 
            row.id = `task-row-${task.id}`;
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap: 16px;">
                    <span class="task-circle" onclick="Planner.finishTask(${task.id})">✓</span>
                    <div>
                        <div style="font-weight: 600; font-size: 15px;">${task.name}</div>
                        <div style="font-size: 12px; color: var(--clr-text-muted); margin-top: 3px;">
                            ${task.time ? '⏰ ' + task.time : ''} 
                            ${task.tag ? '<span class="task-tag-badge" style="margin-left: 8px;">' + task.tag + '</span>' : ''}
                        </div>
                    </div>
                </div>
                <div style="color: var(--clr-gold); font-size: 12px; font-weight: 600;">+25 XP</div>
            `;
            taskList.appendChild(row);
        });
    },

    finishTask: (id) => {
        const tasks = Storage.load('tasks') || []; 
        const task = tasks.find(t => t.id === id);
        if (task) {
            const row = document.getElementById(`task-row-${id}`); 
            if (row) { 
                const circle = row.querySelector('.task-circle'); 
                if (circle) circle.classList.add('done'); 
                row.classList.add('fade-out'); 
            }
            setTimeout(() => {
                task.status = 'done'; 
                Storage.save('tasks', tasks);
                
                const user = Storage.load('user') || { name: 'Nhà Thám Hiểm', totalXp: 0, streak: 0 };
                user.streak = (user.streak || 0) + 1;
                user.bestStreak = Math.max(user.bestStreak || 0, user.streak);
                Storage.save('user', user);

                // Thưởng +25 XP khi hoàn thành nhiệm vụ
                LevelSystem.addXp(25);

                Planner.renderTasks(); 
                window.updateDashboardStats();
            }, 350);
        }
    }
};

window.openTaskModalStep1 = () => { 
    document.getElementById('new-task-name').value = '';
    document.getElementById('modal-task-step1').style.display = 'flex'; 
};

window.goToTaskStep2 = () => { 
    const name = document.getElementById('new-task-name').value; 
    if (!name.trim()) { alert('Vui lòng nhập tên công việc!'); return; } 
    document.getElementById('modal-task-step1').style.display = 'none'; 
    
    // Tự động gán ngày đang chọn trên calendar
    const year = PlannerCalendar.selectedDate.getFullYear();
    const month = (PlannerCalendar.selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = PlannerCalendar.selectedDate.getDate().toString().padStart(2, '0');
    document.getElementById('new-task-date').value = `${year}-${month}-${day}`;
    
    document.getElementById('modal-task-step2').style.display = 'flex'; 
};

window.saveNewTask = () => {
    const name = document.getElementById('new-task-name').value; 
    const date = document.getElementById('new-task-date').value; 
    if (!date) { alert('Vui lòng chọn ngày!'); return; } 
    
    const repeat = document.getElementById('new-task-repeat').value; 
    const time = document.getElementById('new-task-time').value; 
    const tag = document.getElementById('new-task-tag').value;
    
    const tasks = Storage.load('tasks') || []; 
    tasks.push({ 
        id: Date.now(), 
        name, 
        date, 
        deadline: date, 
        repeat, 
        time, 
        tag, 
        status: 'pending' 
    });
    
    Storage.save('tasks', tasks); 
    closeModals(); 
    Planner.renderTasks();
};

/* ----------------------------------------------------
   5. CALENDAR LOGIC (Mini 7 Days & Full Month)
   ---------------------------------------------------- */
const PlannerCalendar = {
    currentMonth: new Date().getMonth(), 
    currentYear: new Date().getFullYear(),
    selectedDate: new Date(),
    
    init: function() { 
        this.renderMonth(this.currentMonth, this.currentYear);
        this.renderMiniCalendar();
    },
    
    renderMiniCalendar: function() {
        const container = document.getElementById('mini-calendar-container');
        if (!container) return;
        container.innerHTML = '';
        
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const today = new Date();
        
        for (let i = -3; i <= 3; i++) {
            const d = new Date();
            d.setDate(today.getDate() + i);
            
            const isSelected = (d.getDate() === this.selectedDate.getDate() && 
                                d.getMonth() === this.selectedDate.getMonth() && 
                                d.getFullYear() === this.selectedDate.getFullYear());
            
            const dayDiv = document.createElement('div');
            dayDiv.className = `cal-day ${isSelected ? 'active' : ''}`;
            dayDiv.innerHTML = `
                <span class="cal-day-label">${days[d.getDay()]}</span>
                <span class="cal-day-num">${d.getDate() < 10 ? '0' + d.getDate() : d.getDate()}</span>
            `;
            dayDiv.onclick = (e) => {
                e.stopPropagation();
                this.selectDate(d.getDate(), d.getMonth(), d.getFullYear());
            };
            container.appendChild(dayDiv);
        }
    },

    renderMonth: function(month, year) {
        const body = document.getElementById('full-calendar-body');
        const headerTitle = document.getElementById('cal-month-year');
        if (!body || !headerTitle) return;

        headerTitle.textContent = `Tháng ${month + 1} / ${year}`;
        body.innerHTML = '<span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>';
        
        let firstDay = new Date(year, month, 1).getDay();
        if (firstDay === 0) firstDay = 7; 
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i < firstDay; i++) {
            body.innerHTML += '<div></div>';
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const isSelected = (i === this.selectedDate.getDate() && 
                                month === this.selectedDate.getMonth() && 
                                year === this.selectedDate.getFullYear());
            body.innerHTML += `<div class="fc-cell ${isSelected ? 'active' : ''}" onclick="PlannerCalendar.selectDate(${i}, ${month}, ${year})">${i}</div>`;
        }
    },
    
    selectDate: function(day, month, year) {
        this.selectedDate = new Date(year, month, day);
        this.renderMonth(this.currentMonth, this.currentYear);
        this.renderMiniCalendar();
        Planner.renderTasks();
    },

    prevMonth: function() { 
        this.currentMonth--; 
        if(this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; } 
        this.renderMonth(this.currentMonth, this.currentYear); 
    },
    
    nextMonth: function() { 
        this.currentMonth++; 
        if(this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; } 
        this.renderMonth(this.currentMonth, this.currentYear); 
    }
};
window.openCalendar2026 = () => { 
    document.getElementById('modal-calendar').style.display = 'flex'; 
    PlannerCalendar.init(); 
};

/* ----------------------------------------------------
   6. TIMER & POMODORO
   ---------------------------------------------------- */
let currentTimerMode = 'timer'; 
let timerInterval; 
let timeLeft = 25 * 60; 
let isRunning = false; 
let sessionsCount = 4; 
let breakMinutes = 5;

window.switchTimerMode = (mode) => {
    currentTimerMode = mode;
    document.getElementById('tab-timer').classList.toggle('active', mode === 'timer');
    document.getElementById('tab-pomo').classList.toggle('active', mode === 'pomodoro');
    document.getElementById('timer-settings').style.display = mode === 'timer' ? 'block' : 'none';
    document.getElementById('pomodoro-settings').style.display = mode === 'pomodoro' ? 'flex' : 'none';
    resetTimerLogic();
};

function getInitialSeconds() {
    if (currentTimerMode === 'timer') { 
        const input = document.getElementById('pomodoro-custom-time'); 
        const min = parseInt(input?.value) || 25; 
        return min * 60; 
    }
    else if (currentTimerMode === 'pomodoro') { return 25 * 60; }
    else if (currentTimerMode === 'break') { return breakMinutes * 60; }
    return 25 * 60;
}

function updateTimerDisplay() {
    const clock = document.getElementById('timer-clock'); 
    const activeClock = document.getElementById('active-timer-clock');
    const m = Math.floor(timeLeft / 60); 
    const s = timeLeft % 60; 
    const timeString = `${m}:${s < 10 ? '0' : ''}${s}`;
    if (clock) clock.textContent = timeString; 
    if (activeClock) activeClock.textContent = timeString;
}

window.startTimerLogic = () => {
    document.getElementById('modal-active-timer').style.display = 'flex';
    if (isRunning) { 
        clearInterval(timerInterval); 
        document.getElementById('pomodoro-start').textContent = 'Tiếp tục'; 
        document.getElementById('btn-active-timer-pause').textContent = 'Tiếp tục'; 
        isRunning = false; 
    } else {
        if (timeLeft <= 0) { 
            if (currentTimerMode === 'pomodoro') { 
                sessionsCount = parseInt(document.getElementById('pomo-sessions').value) || 4; 
                breakMinutes = parseInt(document.getElementById('pomo-break').value) || 5; 
            } 
            timeLeft = getInitialSeconds(); 
        }
        isRunning = true; 
        document.getElementById('pomodoro-start').textContent = 'Tạm dừng'; 
        document.getElementById('btn-active-timer-pause').textContent = 'Tạm dừng';
        
        const subtitle = document.getElementById('active-timer-subtitle');
        if (subtitle) {
            if (currentTimerMode === 'break') { subtitle.textContent = "☕ Giờ giải lao! Hít thở sâu và thư giãn mắt nhé."; }
            else { subtitle.textContent = `🌌 "Cứ kiên định từng phút giây, tri thức sẽ nở rộ."`; }
        }
        
        timerInterval = setInterval(() => {
            timeLeft--; 
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                if (currentTimerMode === 'timer') { showTimerCompleteModal(); }
                else if (currentTimerMode === 'pomodoro') {
                    sessionsCount--; 
                    if (sessionsCount > 0) { 
                        currentTimerMode = 'break'; 
                        timeLeft = getInitialSeconds(); 
                        isRunning = false; 
                        startTimerLogic(); 
                    } else { 
                        showTimerCompleteModal(); 
                        currentTimerMode = 'pomodoro'; 
                    }
                }
                else if (currentTimerMode === 'break') { 
                    currentTimerMode = 'pomodoro'; 
                    timeLeft = getInitialSeconds(); 
                    isRunning = false; 
                    startTimerLogic(); 
                }
            }
        }, 1000);
    }
};

window.resetTimerLogic = () => {
    clearInterval(timerInterval); 
    isRunning = false;
    const startBtn = document.getElementById('pomodoro-start'); 
    if (startBtn) startBtn.textContent = 'Bắt đầu';
    if (currentTimerMode === 'break') { currentTimerMode = 'pomodoro'; }
    timeLeft = getInitialSeconds(); 
    updateTimerDisplay();
};

function showTimerCompleteModal() {
    document.getElementById('modal-active-timer').style.display = 'none'; 
    document.getElementById('modal-timer-done').style.display = 'flex';
    // Thưởng +30 XP khi hoàn thành phiên tập trung
    LevelSystem.addXp(30);
    resetTimerLogic();
}

window.closeTimerModal = () => { document.getElementById('modal-timer-done').style.display = 'none'; };
window.stopActiveTimer = () => { resetTimerLogic(); document.getElementById('modal-active-timer').style.display = 'none'; };

/* ----------------------------------------------------
   7. FLASHCARDS
   ---------------------------------------------------- */
window.openAddDeckModal = () => { 
    document.getElementById('deck-name').value = ''; 
    const container = document.getElementById('deck-cards-container'); 
    container.innerHTML = ''; 
    DeckManager.addCardRow(); 
    DeckManager.addCardRow(); 
    DeckManager.addCardRow(); 
    document.getElementById('modal-add-deck').style.display = 'flex'; 
};

const DeckManager = {
    addCardRow: () => {
        const container = document.getElementById('deck-cards-container'); 
        const row = document.createElement('div'); 
        row.style.display = 'flex'; 
        row.style.gap = '10px'; 
        row.className = 'card-input-row';
        row.innerHTML = `
            <input type="text" class="input-glass card-def" placeholder="Thuật ngữ / Câu hỏi..." style="flex: 1;">
            <input type="text" class="input-glass card-content" placeholder="Định nghĩa / Lời giải..." style="flex: 1;">
            <button type="button" class="btn" style="background:transparent; color:var(--clr-text-muted);" onclick="this.parentElement.remove()">✕</button>
        `;
        container.appendChild(row);
    }
};

const StudyManager = {
    currentDeck: null, currentIndex: 0, isFlipped: false,
    startStudy: (deckId) => {
        const decks = Storage.load('decks') || []; 
        const deck = decks.find(d => d.id === deckId);
        if (!deck || !deck.cards || deck.cards.length === 0) { 
            alert("Bộ thẻ này chưa có nội dung nào!"); 
            return; 
        }
        StudyManager.currentDeck = deck; 
        StudyManager.currentIndex = 0; 
        StudyManager.isFlipped = false;
        document.getElementById('study-deck-title').textContent = deck.name; 
        document.getElementById('modal-study-deck').style.display = 'flex'; 
        StudyManager.renderCurrentCard();
    },
    renderCurrentCard: () => {
        const deck = StudyManager.currentDeck; 
        document.getElementById('study-deck-progress').textContent = `${StudyManager.currentIndex + 1} / ${deck.cards.length}`;
        const card = deck.cards[StudyManager.currentIndex]; 
        document.getElementById('study-front-text').textContent = card.def; 
        document.getElementById('study-back-text').textContent = card.content;
        StudyManager.isFlipped = false; 
        document.getElementById('study-flip-inner').parentElement.classList.remove('flipped');
    },
    handleClick: () => {
        if (!StudyManager.isFlipped) { 
            document.getElementById('study-flip-inner').parentElement.classList.add('flipped'); 
            StudyManager.isFlipped = true; 
        } else {
            StudyManager.currentIndex++; 
            if (StudyManager.currentIndex >= StudyManager.currentDeck.cards.length) { 
                alert('🎉 Chúc mừng bạn đã hoàn thành bộ thẻ ghi nhớ!'); 
                LevelSystem.addXp(20);
                closeModals(); 
            } else { 
                StudyManager.renderCurrentCard(); 
            }
        }
    }
};

window.searchDecks = () => {
    const searchInput = document.getElementById('deck-search');
    const query = (searchInput ? searchInput.value : '').toLowerCase();
    const decks = Storage.load('decks') || [];
    const container = document.getElementById('decks-container');
    if (!container) return;
    
    container.innerHTML = '';
    const filteredDecks = decks.filter(d => d.name.toLowerCase().includes(query));
    
    if (filteredDecks.length === 0) {
        container.innerHTML = '<p style="color:var(--clr-text-muted); grid-column: 1/-1; text-align:center; padding: 30px;">Chưa có bộ thẻ nào. Hãy nhấn "+ Tạo Bộ Thẻ Mới" để bắt đầu!</p>';
        return;
    }

    filteredDecks.forEach(deck => {
        const card = document.createElement('div');
        card.className = 'card glass interactive deck-card';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'deck-delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Xóa bộ thẻ';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if(confirm(`Bạn có chắc muốn xóa bộ thẻ "${deck.name}"?`)) {
                let allDecks = Storage.load('decks') || [];
                allDecks = allDecks.filter(d => d.id !== deck.id);
                Storage.save('decks', allDecks);
                window.searchDecks();
                window.updateDashboardStats();
            }
        };

        const innerContent = document.createElement('div');
        innerContent.innerHTML = `
            <div style="font-size: 28px; margin-bottom: 12px;">🗂️</div>
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">${deck.name}</h3>
            <p style="color: var(--clr-cyan-soft); font-size: 13px;">${deck.cards ? deck.cards.length : 0} thẻ ghi nhớ</p>
        `;
        
        card.appendChild(deleteBtn);
        card.appendChild(innerContent);
        card.onclick = () => StudyManager.startStudy(deck.id);
        container.appendChild(card);
    });
};

/* ----------------------------------------------------
   8. TRẠM TÂM SỰ VŨ TRỤ (GALAXY CONFESSIONS)
   Lưu trữ trên Server Express để tất cả mọi người cùng thấy
   ---------------------------------------------------- */
let currentConfessions = [];
let activeFilter = 'all';
let selectedAvatar = '🪐';
let selectedMood = 'Áp lực thi cử 🌪️';

window.selectPostAvatar = function(el) {
    document.querySelectorAll('.avatar-opt').forEach(opt => opt.classList.remove('selected'));
    el.classList.add('selected');
    selectedAvatar = el.getAttribute('data-avatar') || '🪐';
};

window.selectPostMood = function(el) {
    document.querySelectorAll('.mood-pill').forEach(pill => pill.classList.remove('active'));
    el.classList.add('active');
    selectedMood = el.getAttribute('data-mood') || 'Tâm sự 💭';
};

window.toggleAnonMode = function(checkbox) {
    const authorInput = document.getElementById('confession-author-input');
    if (checkbox.checked) {
        authorInput.value = 'Ẩn danh bí mật';
        authorInput.disabled = true;
    } else {
        const user = Storage.load('user');
        authorInput.value = user?.name || '';
        authorInput.disabled = false;
    }
};

async function loadConfessionsFromServer() {
    const feed = document.getElementById('confessions-feed');
    if (!feed) return;
    
    try {
        const res = await fetch('/api/confessions');
        if (!res.ok) throw new Error('Không thể kết nối máy chủ');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            currentConfessions = json.data;
            renderConfessions();
        }
    } catch (err) {
        console.warn('Sử dụng dữ liệu offline:', err);
        // Fallback hiển thị mẫu nếu offline
        if (currentConfessions.length === 0) {
            currentConfessions = [
                {
                    id: 'sample_1',
                    author: 'Ngôi Sao Lạc Lối',
                    avatar: '🪐',
                    mood: 'Áp lực thi cử 🌪️',
                    content: 'Tuần này mình có 3 bài kiểm tra liền, cảm thấy hơi kiệt sức. Nhưng nhìn danh sách task trên Eduvia hoàn thành dần dần, mình lại có động lực bước tiếp. Mọi người cùng cố lên nhé!',
                    timestamp: Date.now() - 3600000 * 2,
                    reactions: { heart: 12, hug: 18, star: 9, rocket: 7 }
                }
            ];
        }
        renderConfessions();
    }
}

window.filterConfessions = function(filterType, chipEl) {
    activeFilter = filterType;
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
    if (chipEl) chipEl.classList.add('active');
    renderConfessions();
};

function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Gần đây';
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return new Date(timestamp).toLocaleDateString('vi-VN');
}

function renderConfessions() {
    const feed = document.getElementById('confessions-feed');
    if (!feed) return;

    const reactedIds = Storage.load('reacted_confessions') || [];

    let filtered = [...currentConfessions];
    if (activeFilter === 'popular') {
        filtered.sort((a, b) => {
            const scoreA = Object.values(a.reactions || {}).reduce((s, v) => s + v, 0);
            const scoreB = Object.values(b.reactions || {}).reduce((s, v) => s + v, 0);
            return scoreB - scoreA;
        });
    } else if (activeFilter === 'exam') {
        filtered = filtered.filter(item => (item.mood || '').includes('Áp lực') || (item.mood || '').includes('thi cử'));
    } else if (activeFilter === 'motivation') {
        filtered = filtered.filter(item => (item.mood || '').includes('động lực') || (item.mood || '').includes('mục tiêu'));
    }

    if (filtered.length === 0) {
        feed.innerHTML = `<p style="text-align:center; color:var(--clr-text-muted); padding: 40px;">Chưa có lời tâm sự nào trong danh mục này. Bạn hãy là người đầu tiên chia sẻ nhé! ✨</p>`;
        return;
    }

    feed.innerHTML = '';
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'confession-card glass';

        const reactions = item.reactions || { heart: 0, hug: 0, star: 0, rocket: 0 };
        const isHeartReacted = reactedIds.includes(`${item.id}_heart`);
        const isHugReacted = reactedIds.includes(`${item.id}_hug`);
        const isStarReacted = reactedIds.includes(`${item.id}_star`);
        const isRocketReacted = reactedIds.includes(`${item.id}_rocket`);

        card.innerHTML = `
            <div class="confession-card-header">
                <div class="confession-author-info">
                    <div class="confession-avatar">${item.avatar || '🪐'}</div>
                    <div>
                        <div class="confession-author-name">${item.author || 'Người Bạn Vũ Trụ'}</div>
                        <span class="confession-time">${formatRelativeTime(item.timestamp)}</span>
                    </div>
                </div>
                <span class="task-tag-badge" style="background: rgba(196, 181, 253, 0.15); border-color: var(--clr-lavender);">
                    ${item.mood || 'Tâm sự 💭'}
                </span>
            </div>
            
            <div class="confession-body">${item.content}</div>

            <div class="confession-reactions">
                <button class="reaction-btn ${isHeartReacted ? 'user-reacted' : ''}" onclick="reactToConfession('${item.id}', 'heart', this)">
                    <span>❤️</span> Đồng cảm <strong style="color:var(--clr-white);">${reactions.heart || 0}</strong>
                </button>
                <button class="reaction-btn ${isHugReacted ? 'user-reacted' : ''}" onclick="reactToConfession('${item.id}', 'hug', this)">
                    <span>🫂</span> Ôm bạn <strong style="color:var(--clr-white);">${reactions.hug || 0}</strong>
                </button>
                <button class="reaction-btn ${isStarReacted ? 'user-reacted' : ''}" onclick="reactToConfession('${item.id}', 'star', this)">
                    <span>✨</span> Cố lên <strong style="color:var(--clr-white);">${reactions.star || 0}</strong>
                </button>
                <button class="reaction-btn ${isRocketReacted ? 'user-reacted' : ''}" onclick="reactToConfession('${item.id}', 'rocket', this)">
                    <span>🚀</span> Động lực <strong style="color:var(--clr-white);">${reactions.rocket || 0}</strong>
                </button>
            </div>
        `;
        feed.appendChild(card);
    });
}

window.submitNewConfession = async function() {
    const textEl = document.getElementById('confession-text');
    const authorEl = document.getElementById('confession-author-input');
    const anonCheck = document.getElementById('confession-anon-check');
    const sendBtn = document.getElementById('btn-send-confession');

    const content = textEl.value.trim();
    if (!content) {
        alert('Vui lòng nhập nội dung tâm sự của bạn!');
        textEl.focus();
        return;
    }

    const author = (anonCheck && anonCheck.checked) ? 'Ẩn danh bí mật' : (authorEl.value.trim() || 'Người Bạn Vũ Trụ');

    sendBtn.disabled = true;
    sendBtn.innerHTML = 'Đang gửi... ⏳';

    try {
        const res = await fetch('/api/confessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                author: author,
                avatar: selectedAvatar,
                mood: selectedMood,
                content: content
            })
        });

        const data = await res.json();
        if (data.success) {
            textEl.value = '';
            // Tặng +15 XP cho hoạt động chia sẻ tâm sự
            LevelSystem.addXp(15);
            alert('🎉 Tâm sự của bạn đã được gửi thành công vào vũ trụ Eduvia!');
            loadConfessionsFromServer();
        } else {
            alert(data.message || 'Gửi thất bại, vui lòng thử lại.');
        }
    } catch (err) {
        console.error(err);
        alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối!');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = 'Phóng Tín Hiệu 🚀';
    }
};

window.reactToConfession = async function(id, type, btnEl) {
    const reactedKey = `${id}_${type}`;
    let reactedIds = Storage.load('reacted_confessions') || [];
    
    if (reactedIds.includes(reactedKey)) {
        // Đã react rồi
        return;
    }

    reactedIds.push(reactedKey);
    Storage.save('reacted_confessions', reactedIds);

    // Hiệu ứng giao diện trước
    btnEl.classList.add('user-reacted');
    const countEl = btnEl.querySelector('strong');
    if (countEl) {
        countEl.textContent = parseInt(countEl.textContent || 0) + 1;
    }

    // Tặng +5 XP cho sự tử tế
    LevelSystem.addXp(5);

    try {
        await fetch(`/api/confessions/${id}/react`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type })
        });
    } catch (err) {
        console.warn('Lỗi đồng bộ react:', err);
    }
};

/* ----------------------------------------------------
   9. INITIALIZATION
   ---------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cập nhật User & Stats
    updateUserInfo();
    window.updateDashboardStats();

    // 2. Điền tên người dùng vào ô đăng tâm sự
    const user = Storage.load('user');
    const authorInput = document.getElementById('confession-author-input');
    if (authorInput && user?.name) {
        authorInput.value = user.name;
    }

    // 3. Khởi tạo Tasks & Calendar
    Planner.renderTasks(); 
    PlannerCalendar.init();

    // 4. Khởi tạo Flashcards
    window.searchDecks();

    const formAddDeck = document.getElementById('form-add-deck-modal');
    if (formAddDeck) {
        formAddDeck.addEventListener('submit', (e) => {
            e.preventDefault();
            const deckName = document.getElementById('deck-name').value;
            
            const rows = document.querySelectorAll('.card-input-row');
            const newCards = [];
            rows.forEach(row => {
                const def = row.querySelector('.card-def').value.trim();
                const content = row.querySelector('.card-content').value.trim();
                if (def && content) {
                    newCards.push({ def, content });
                }
            });

            if (deckName && newCards.length > 0) {
                const decks = Storage.load('decks') || [];
                decks.push({
                    id: Date.now(),
                    name: deckName,
                    cards: newCards
                });
                Storage.save('decks', decks);
                window.searchDecks();
                window.updateDashboardStats();
                LevelSystem.addXp(30); // Tặng 30 XP khi soạn bộ thẻ mới

                closeModals();
                formAddDeck.reset();
            } else {
                alert("Vui lòng điền đủ Tên bộ thẻ và ít nhất 1 dòng thẻ!");
            }
        });
    }

    // 5. Timer setup
    const inputTime = document.getElementById('pomodoro-custom-time'); 
    if (inputTime) { 
        inputTime.addEventListener('input', () => { 
            if (!isRunning) resetTimerLogic(); 
        }); 
    }
    resetTimerLogic();

    // 6. Nạp lời tâm sự
    loadConfessionsFromServer();
});

// ===================================================
// 7. INTRO OPENING CURTAIN CONTROLS (RAINBOW & CLOUDS)
// ===================================================
window.openEduviaCurtain = function(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const curtain = document.getElementById('eduvia-intro-curtain');
    if (!curtain || curtain.classList.contains('curtain-hidden') || curtain.classList.contains('opening')) return;

    curtain.classList.add('opening');
    setTimeout(() => {
        curtain.classList.add('curtain-hidden');
    }, 950);
};

window.replayEduviaCurtain = function() {
    const curtain = document.getElementById('eduvia-intro-curtain');
    if (!curtain) return;
    curtain.classList.remove('curtain-hidden', 'opening');
};

// ===================================================
// 8. MOBILE USER PROFILE & LEVEL DETAILS MODAL
// ===================================================
window.openMobileProfileModal = function() {
    const user = Storage.load('user') || { name: 'Bạn Học Vũ Trụ', totalXp: 0, streak: 0 };
    const info = LevelSystem.getInfo(user.totalXp || 0);

    const modal = document.getElementById('modal-user-profile');
    if (!modal) return;

    const pName = document.getElementById('modal-profile-name');
    const pBadge = document.getElementById('modal-profile-badge');
    const pRank = document.getElementById('modal-profile-rank');
    const pStreak = document.getElementById('modal-profile-streak');
    const pXp = document.getElementById('modal-profile-xp');
    const pXpMini = document.getElementById('modal-profile-xp-mini');

    if (pName) pName.textContent = user.name || 'Bạn Học Vũ Trụ';
    if (pBadge) pBadge.textContent = info.tier.badge;
    if (pRank) pRank.textContent = `Cấp bậc: ${info.tier.badge} ${info.tier.name}`;
    if (pStreak) pStreak.textContent = `🔥 ${user.streak || 0} ngày`;
    if (pXp) pXp.textContent = `${user.totalXp || 0} XP`;
    if (pXpMini) pXpMini.textContent = `${info.currentTierXp} / ${info.tier.xpNeeded} XP`;

    modal.style.display = 'flex';
};

// ===================================================
// 9. COSMIC LO-FI & AMBIENT AUDIO ENGINE (WEB AUDIO API)
//    Âm thanh ấm áp, du dương, nghe rõ ràng trên mọi thiết bị
// ===================================================
window.CosmicAudio = {
    ctx: null,
    isPlaying: false,
    currentTrack: 'lofi-space',
    masterGain: null,
    activeNodes: [],
    activeIntervals: [],
    activeTimeouts: [],
    volume: 0.75,
    timerId: null,

    async init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    },

    setVolume(val) {
        const num = Math.max(0, Math.min(100, parseInt(val, 10) || 75));
        this.volume = num / 100;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
        }
        const label = document.getElementById('cmp-volume-val');
        if (label) label.textContent = `${num}%`;
    },

    stopAll() {
        // Xóa sạch các intervals và timeouts phát nhạc
        this.activeIntervals.forEach(id => clearInterval(id));
        this.activeIntervals = [];
        this.activeTimeouts.forEach(id => clearTimeout(id));
        this.activeTimeouts = [];

        // Ngắt kết nối và dừng tất cả audio nodes
        this.activeNodes.forEach(node => {
            try {
                if (node.stop) node.stop();
                if (node.disconnect) node.disconnect();
            } catch(e) {}
        });
        this.activeNodes = [];
    },

    async togglePlay() {
        await this.init();
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play(this.currentTrack);
        }
    },

    async play(trackKey) {
        await this.init();
        this.stopAll();
        if (trackKey) this.currentTrack = trackKey;
        // Map alias tương thích ngược
        if (this.currentTrack === 'deep-space') this.currentTrack = 'lofi-space';
        if (this.currentTrack === 'nebula-wind') this.currentTrack = 'starlight-box';

        this.isPlaying = true;

        try {
            if (this.currentTrack === 'lofi-space') {
                this.generateLofiSpace();
            } else if (this.currentTrack === 'cosmic-rain') {
                this.generateCosmicRain();
            } else if (this.currentTrack === 'alpha-waves') {
                this.generateAlphaWaves();
            } else if (this.currentTrack === 'starlight-box') {
                this.generateStarlightBox();
            }
        } catch(err) {
            console.warn('CosmicAudio play error:', err);
        }

        this.updateUI();
    },

    pause() {
        this.isPlaying = false;
        this.stopAll();
        this.updateUI();
    },

    async switchTrack(trackKey) {
        this.currentTrack = trackKey;
        await this.init();
        this.play(trackKey);
    },

    // 1. VŨ TRỤ LO-FI: Chuỗi hợp âm Lo-Fi ấm áp (Cmaj7 -> Am9 -> Fmaj7 -> G6)
    // Tần số từ 174Hz đến 493Hz, âm lượng chuẩn, mượt mà trên loa laptop/điện thoại
    generateLofiSpace() {
        if (!this.ctx) return;

        // Bộ lọc ấm áp phong cách Lo-Fi
        const lofiFilter = this.ctx.createBiquadFilter();
        lofiFilter.type = 'lowpass';
        lofiFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
        lofiFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);
        lofiFilter.connect(this.masterGain);
        this.activeNodes.push(lofiFilter);

        // Hợp âm Lo-Fi ấm áp
        const chords = [
            [261.63, 329.63, 392.00, 493.88], // Cmaj7: C4, E4, G4, B4
            [220.00, 261.63, 329.63, 392.00, 493.88], // Am9: A3, C4, E4, G4, B4
            [174.61, 220.00, 261.63, 329.63], // Fmaj7: F3, A3, C4, E4
            [196.00, 246.94, 293.66, 329.63]  // G6: G3, B3, D4, E4
        ];

        let chordIndex = 0;
        const playChord = () => {
            if (!this.isPlaying || this.currentTrack !== 'lofi-space') return;
            const now = this.ctx.currentTime;
            const currentChord = chords[chordIndex];
            chordIndex = (chordIndex + 1) % chords.length;

            currentChord.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                // Kết hợp sine ấm và triangle ngọt ngào
                osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, now);

                // Nhẹ nhàng vibrato kiểu băng cassette Lo-Fi
                const vibrato = this.ctx.createOscillator();
                const vibGain = this.ctx.createGain();
                vibrato.frequency.setValueAtTime(4.2, now);
                vibGain.gain.setValueAtTime(1.2, now);
                vibrato.connect(osc.frequency);
                vibrato.start(now);
                vibrato.stop(now + 3.8);

                // ADSR Envelope êm ái
                gain.gain.setValueAtTime(0.001, now);
                gain.gain.linearRampToValueAtTime(0.18 / Math.sqrt(currentChord.length), now + 0.22);
                gain.gain.exponentialRampToValueAtTime(0.07 / Math.sqrt(currentChord.length), now + 2.0);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.75);

                osc.connect(gain);
                gain.connect(lofiFilter);

                osc.start(now);
                osc.stop(now + 3.8);
            });
        };

        playChord();
        const chordInterval = setInterval(playChord, 3600);
        this.activeIntervals.push(chordInterval);

        // Thêm tiếng hạt nhựa Lo-Fi Vinyl Crackle nhẹ nhàng tạo không gian ấm
        try {
            const bufferSize = this.ctx.sampleRate * 2;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                const isPop = Math.random() < 0.0012;
                output[i] = isPop ? (Math.random() * 0.35 - 0.175) : (Math.random() * 0.015 - 0.0075);
            }
            const vinylSrc = this.ctx.createBufferSource();
            vinylSrc.buffer = noiseBuffer;
            vinylSrc.loop = true;

            const vinylGain = this.ctx.createGain();
            vinylGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

            vinylSrc.connect(vinylGain);
            vinylGain.connect(this.masterGain);
            vinylSrc.start();
            this.activeNodes.push(vinylSrc, vinylGain);
        } catch(e) {}
    },

    // 2. MƯA SAO BĂNG & CHUÔNG GIÓ: Tiếng mưa êm ái + Chuông ngân du dương Pentatonic
    generateCosmicRain() {
        if (!this.ctx) return;

        // Tiếng mưa không gian ấm áp
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.6;
        }

        const rainSrc = this.ctx.createBufferSource();
        rainSrc.buffer = noiseBuffer;
        rainSrc.loop = true;

        const rainFilter = this.ctx.createBiquadFilter();
        rainFilter.type = 'bandpass';
        rainFilter.frequency.setValueAtTime(950, this.ctx.currentTime);
        rainFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

        const rainGain = this.ctx.createGain();
        rainGain.gain.setValueAtTime(0.24, this.ctx.currentTime);

        rainSrc.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(this.masterGain);
        rainSrc.start();
        this.activeNodes.push(rainSrc, rainFilter, rainGain);

        // Chuông gió sao băng Pentatonic (C5, D5, E5, G5, A5, C6)
        const chimeNotes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
        const ringChime = () => {
            if (!this.isPlaying || this.currentTrack !== 'cosmic-rain') return;
            const now = this.ctx.currentTime;
            const note = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];

            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(note, now);

            // Hòa âm phụ nhẹ (overtone)
            const osc2 = this.ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(note * 2, now);

            const chimeGain = this.ctx.createGain();
            chimeGain.gain.setValueAtTime(0.001, now);
            chimeGain.gain.linearRampToValueAtTime(0.18, now + 0.02);
            chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

            const chimeGain2 = this.ctx.createGain();
            chimeGain2.gain.setValueAtTime(0.001, now);
            chimeGain2.gain.linearRampToValueAtTime(0.05, now + 0.02);
            chimeGain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

            osc.connect(chimeGain);
            chimeGain.connect(this.masterGain);
            osc2.connect(chimeGain2);
            chimeGain2.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 3.0);
            osc2.start(now);
            osc2.stop(now + 2.0);
        };

        ringChime();
        const chimeInterval = setInterval(ringChime, 1500);
        this.activeIntervals.push(chimeInterval);
    },

    // 3. SÓNG NÃO ALPHA 432Hz: Nhịp Binaural 10Hz kích thích sóng não tập trung sâu
    generateAlphaWaves() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 432Hz bên trái, 442Hz bên phải => tạo sóng 10Hz Alpha nhịp nhàng
        const oscL = this.ctx.createOscillator();
        oscL.type = 'sine';
        oscL.frequency.setValueAtTime(432.0, now);

        const oscR = this.ctx.createOscillator();
        oscR.type = 'sine';
        oscR.frequency.setValueAtTime(442.0, now);

        const gainL = this.ctx.createGain();
        gainL.gain.setValueAtTime(0.20, now);

        const gainR = this.ctx.createGain();
        gainR.gain.setValueAtTime(0.20, now);

        if (this.ctx.createStereoPanner) {
            const panL = this.ctx.createStereoPanner();
            panL.pan.setValueAtTime(-0.85, now);
            const panR = this.ctx.createStereoPanner();
            panR.pan.setValueAtTime(0.85, now);

            oscL.connect(gainL); gainL.connect(panL); panL.connect(this.masterGain);
            oscR.connect(gainR); gainR.connect(panR); panR.connect(this.masterGain);
            this.activeNodes.push(panL, panR);
        } else {
            oscL.connect(gainL); gainL.connect(this.masterGain);
            oscR.connect(gainR); gainR.connect(this.masterGain);
        }

        oscL.start();
        oscR.start();
        this.activeNodes.push(oscL, oscR, gainL, gainR);

        // Hòa âm D major tĩnh tâm (D4: 293.66, F#4: 369.99, A4: 440.00)
        const chordNotes = [293.66, 369.99, 440.00];
        chordNotes.forEach(freq => {
            const padOsc = this.ctx.createOscillator();
            padOsc.type = 'sine';
            padOsc.frequency.setValueAtTime(freq, now);

            const padGain = this.ctx.createGain();
            padGain.gain.setValueAtTime(0.08, now);

            // LFO lượn nhẹ cho pad
            const padLfo = this.ctx.createOscillator();
            padLfo.frequency.setValueAtTime(0.1, now);
            const padLfoGain = this.ctx.createGain();
            padLfoGain.gain.setValueAtTime(0.02, now);
            padLfo.connect(padLfoGain);
            padLfoGain.connect(padGain.gain);
            padLfo.start();

            padOsc.connect(padGain);
            padGain.connect(this.masterGain);
            padOsc.start();
            this.activeNodes.push(padOsc, padGain, padLfo, padLfoGain);
        });
    },

    // 4. HỘP NHẠC ÁNH SAO: Từng nốt Music Box trong trẻo, êm dịu
    generateStarlightBox() {
        if (!this.ctx) return;

        const melodyNotes = [
            659.25, // E5
            783.99, // G5
            880.00, // A5
            987.77, // B5
            1174.66,// D6
            1046.50,// C6
            987.77, // B5
            783.99  // G5
        ];

        let noteIdx = 0;
        const playMusicBoxNote = () => {
            if (!this.isPlaying || this.currentTrack !== 'starlight-box') return;
            const now = this.ctx.currentTime;
            const freq = melodyNotes[noteIdx];
            noteIdx = (noteIdx + 1) % melodyNotes.length;

            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            // Tiếng gõ hộp nhạc
            const oscHarmonic = this.ctx.createOscillator();
            oscHarmonic.type = 'triangle';
            oscHarmonic.frequency.setValueAtTime(freq * 3, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.24, now + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

            const harmGain = this.ctx.createGain();
            harmGain.gain.setValueAtTime(0.001, now);
            harmGain.gain.linearRampToValueAtTime(0.06, now + 0.008);
            harmGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

            osc.connect(gain);
            gain.connect(this.masterGain);
            oscHarmonic.connect(harmGain);
            harmGain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 1.9);
            oscHarmonic.start(now);
            oscHarmonic.stop(now + 0.5);
        };

        playMusicBoxNote();
        const boxInterval = setInterval(playMusicBoxNote, 950);
        this.activeIntervals.push(boxInterval);
    },

    updateUI() {
        const titles = {
            'lofi-space': '🪐 Vũ Trụ Lo-Fi (Cosmic Lo-Fi)',
            'cosmic-rain': '🌧️ Mưa Sao Băng & Chuông Gió',
            'alpha-waves': '🌌 Sóng Não Alpha 432Hz',
            'starlight-box': '🛸 Hộp Nhạc Ánh Sao (Music Box)'
        };

        const toggleBtn = document.getElementById('cosmic-player-toggle');
        const playIcon = document.getElementById('cmp-play-icon');
        const titleEl = document.getElementById('cmp-current-title');

        if (titleEl) titleEl.textContent = titles[this.currentTrack] || titles['lofi-space'];
        if (playIcon) playIcon.textContent = this.isPlaying ? '⏸' : '▶';

        if (toggleBtn) {
            if (this.isPlaying) {
                toggleBtn.classList.add('is-playing');
            } else {
                toggleBtn.classList.remove('is-playing');
            }
        }

        document.querySelectorAll('.cmp-track-btn').forEach(btn => {
            const track = btn.getAttribute('data-track');
            if (track === this.currentTrack || 
               (this.currentTrack === 'lofi-space' && track === 'deep-space') ||
               (this.currentTrack === 'starlight-box' && track === 'nebula-wind')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    setSleepTimer(mins) {
        if (this.timerId) clearTimeout(this.timerId);
        const m = parseInt(mins, 10);
        if (m > 0) {
            this.timerId = setTimeout(() => {
                this.pause();
                alert(`Đã hoàn thành phiên thư giãn vũ trụ ${m} phút. Chúc bạn học tập thật tốt! ✨`);
            }, m * 60 * 1000);
        }
    }
};

window.toggleMusicPlayer = function(forcePlay) {
    const modal = document.getElementById('cosmic-music-modal');
    if (!modal) return;
    const isShown = modal.classList.contains('show');
    if (isShown && !forcePlay) {
        modal.classList.remove('show');
    } else {
        modal.classList.add('show');
        // Khi người dùng nhấn nút Nhạc Vũ Trụ trên navbar, nếu chưa phát thì tự động phát ngay lập tức
        if (!window.CosmicAudio.isPlaying) {
            window.CosmicAudio.play();
        }
    }
};
    
// ===================================================
// HỖ TRỢ LƯỚT NGANG (SCROLL & DRAG) CHO THANH MENU TRÊN ĐIỆN THOẠI
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    let isDown = false;
    let startX, scrollLeft;

    navMenu.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - navMenu.offsetLeft;
        scrollLeft = navMenu.scrollLeft;
    });

    navMenu.addEventListener('mouseleave', () => { isDown = false; });
    navMenu.addEventListener('mouseup', () => { isDown = false; });

    navMenu.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - navMenu.offsetLeft;
        const walk = (x - startX) * 1.6;
        navMenu.scrollLeft = scrollLeft - walk;
    });

    // Khi chuyển view, tự động cuộn tab đang active vào giữa tầm nhìn
    const origSwitchView = window.switchView;
    window.switchView = function(viewId) {
        if (typeof origSwitchView === 'function') {
            origSwitchView(viewId);
        }
        setTimeout(() => {
            const activeBtn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
            if (activeBtn && navMenu) {
                activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }, 50);
    };
});



/* ===================================================
   EDUVIA EXTENDED LOGIC: AUTH, AI TUTOR, EISENHOWER, TIMER AI, FLASHCARDS AI, STUDY MATCH
   =================================================== */

// ----------------------------------------------------
// 1. AUTH & MULTI-DEVICE CLOUD SYNC MANAGER
// ----------------------------------------------------
const AuthManager = {
    currentUser: null,
    isGuest: true,
    regAvatar: '🪐',

    init: () => {
        const savedAuth = localStorage.getItem('eduvia_auth_user');
        if (savedAuth) {
            try {
                AuthManager.currentUser = JSON.parse(savedAuth);
                AuthManager.isGuest = false;
            } catch(e) { AuthManager.currentUser = null; }
        }
        AuthManager.updateNavUI();
    },

    updateNavUI: () => {
        const navAuthLabel = document.getElementById('nav-auth-label');
        const navSyncDot = document.getElementById('nav-sync-dot');
        const navAuthPill = document.getElementById('nav-auth-pill');
        const navUserPill = document.getElementById('nav-user-pill');
        const nameEl = document.getElementById('display-user-name');
        const avatarEl = document.getElementById('user-avatar-icon');

        if (AuthManager.currentUser && !AuthManager.isGuest) {
            if (navAuthPill) navAuthPill.style.display = 'none';
            if (navUserPill) navUserPill.style.display = 'flex';
            if (nameEl) nameEl.textContent = AuthManager.currentUser.name || AuthManager.currentUser.username;
            if (avatarEl) avatarEl.textContent = AuthManager.currentUser.avatar || '🪐';
        } else {
            if (navAuthPill) {
                navAuthPill.style.display = 'flex';
                if (navAuthLabel) navAuthLabel.innerHTML = `🔑 Đăng nhập / Đăng ký`;
                if (navSyncDot) { navSyncDot.className = 'sync-status-dot offline'; navSyncDot.title = 'Chưa đăng nhập (Lưu cục bộ)'; }
            }
            if (navUserPill) navUserPill.style.display = 'none';
        }
    },

    openModal: () => {
        if (AuthManager.currentUser && !AuthManager.isGuest) {
            const syncOrLogout = confirm(`Bạn đang đăng nhập: ${AuthManager.currentUser.name} (${AuthManager.currentUser.username}).\n\n- Nhấn OK để ĐỒNG BỘ TIẾN TRÌNH lên đám mây.\n- Nhấn Hủy (Cancel) nếu muốn ĐĂNG XUẤT.`);
            if (syncOrLogout) {
                AuthManager.syncToCloud(true);
            } else {
                if (confirm('Bạn có chắc muốn đăng xuất khỏi tài khoản này?')) {
                    AuthManager.currentUser = null;
                    AuthManager.isGuest = true;
                    localStorage.removeItem('eduvia_auth_user');
                    AuthManager.updateNavUI();
                    alert('Đã đăng xuất thành công.');
                }
            }
            return;
        }
        document.getElementById('modal-auth').style.display = 'flex';
    },

    switchTab: (tab) => {
        document.getElementById('tab-auth-login').classList.toggle('active', tab === 'login');
        document.getElementById('tab-auth-register').classList.toggle('active', tab === 'register');
        document.getElementById('form-auth-login').style.display = tab === 'login' ? 'block' : 'none';
        document.getElementById('form-auth-register').style.display = tab === 'register' ? 'block' : 'none';
    },

    selectRegAvatar: (av, btn) => {
        AuthManager.regAvatar = av;
        document.querySelectorAll('#reg-avatar-choices button').forEach(b => b.classList.remove('selected'));
        if (btn) btn.classList.add('selected');
    },

    submitLogin: async () => {
        const u = document.getElementById('login-username').value.trim();
        const p = document.getElementById('login-password').value.trim();
        if (!u || !p) { alert('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!'); return; }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Đăng nhập không thành công!');
                return;
            }

            AuthManager.currentUser = data.user;
            AuthManager.isGuest = false;
            localStorage.setItem('eduvia_auth_user', JSON.stringify(data.user));

            // Khôi phục dữ liệu từ server
            if (data.data) {
                if (data.data.user) Storage.save('user', data.data.user);
                if (data.data.tasks) Storage.save('tasks', data.data.tasks);
                if (data.data.decks) Storage.save('decks', data.data.decks);
            }

            AuthManager.updateNavUI();
            closeModals();
            alert(`🎉 Chào mừng bạn trở lại, ${data.user.name}! Tiến trình học tập của bạn đã được khôi phục thành công.`);
            location.reload();
        } catch(err) {
            console.error('Login error:', err);
            alert('Không thể kết nối máy chủ để đăng nhập.');
        }
    },

    submitRegister: async () => {
        const u = document.getElementById('reg-username').value.trim();
        const n = document.getElementById('reg-name').value.trim();
        const p = document.getElementById('reg-password').value.trim();
        if (!u || !p) { alert('Vui lòng nhập tên đăng nhập và mật khẩu!'); return; }

        // Lấy dữ liệu hiện tại để không bị mất tiến trình
        const currentProgress = {
            user: Storage.load('user') || { name: n || u, totalXp: 50, streak: 1 },
            tasks: Storage.load('tasks') || [],
            decks: Storage.load('decks') || []
        };

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: u,
                    password: p,
                    name: n || u,
                    avatar: AuthManager.regAvatar,
                    initialData: currentProgress
                })
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Đăng ký không thành công!');
                return;
            }

            AuthManager.currentUser = data.user;
            AuthManager.isGuest = false;
            localStorage.setItem('eduvia_auth_user', JSON.stringify(data.user));

            AuthManager.updateNavUI();
            closeModals();
            alert('🎉 Đăng ký thành công! Tiến trình học tập của bạn đã được bảo vệ trên hệ thống.');
            window.updateDashboardStats();
        } catch(err) {
            console.error('Register error:', err);
            alert('Không thể kết nối máy chủ để đăng ký.');
        }
    },

    continueAsGuest: () => {
        AuthManager.isGuest = true;
        closeModals();
    },

    syncToCloud: async (notify = false) => {
        if (!AuthManager.currentUser || AuthManager.isGuest) return;
        try {
            const syncPayload = {
                username: AuthManager.currentUser.username,
                data: {
                    user: Storage.load('user'),
                    tasks: Storage.load('tasks'),
                    decks: Storage.load('decks')
                }
            };
            const res = await fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(syncPayload)
            });
            const data = await res.json();
            if (data.success && notify) {
                alert('☁️ Tiến độ học tập của bạn đã được đồng bộ an toàn lên máy chủ!');
            }
        } catch(e) {
            console.warn('Auto-sync failed:', e.message);
        }
    }
};

// ----------------------------------------------------
// BỘ MÁY PHÁT ÂM SONG NGỮ CHUẨN XÁC (BILINGUAL TEXT-TO-SPEECH)
// Tự động phân tách tiếng Anh và tiếng Việt:
// - Đọc câu/từ tiếng Anh bằng giọng bản ngữ en-US (Google US / Microsoft Zira/David)
// - Đọc câu giải thích tiếng Việt bằng giọng vi-VN (Google Tiếng Việt / Microsoft An)
// ----------------------------------------------------
let cachedSpeechVoices = [];
function getAvailableVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    if (cachedSpeechVoices.length === 0) {
        cachedSpeechVoices = window.speechSynthesis.getVoices() || [];
    }
    return cachedSpeechVoices;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
        cachedSpeechVoices = window.speechSynthesis.getVoices() || [];
    };
}

function findBestVoice(langPrefix) {
    const voices = getAvailableVoices();
    const matched = voices.filter(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix.toLowerCase()));
    if (matched.length === 0) return null;
    const premium = matched.find(v => /natural|online|google|zira|david|an/i.test(v.name));
    return premium || matched[0];
}

// Kiểm tra xem một đoạn văn/câu có phải là tiếng Anh hay không
function isEnglishSentence(str) {
    const clean = (str || '').trim();
    if (!clean || clean.length < 2) return false;
    // Nếu có nguyên âm có dấu tiếng Việt, chắc chắn là tiếng Việt
    if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(clean)) {
        return false;
    }
    // Danh sách từ vựng & cấu trúc ngữ pháp tiếng Anh phổ biến
    const englishWords = /\b(the|a|an|is|are|am|was|were|be|been|have|has|had|do|does|did|will|would|can|could|should|may|might|must|i|you|he|she|it|we|they|my|your|his|her|its|our|their|this|that|these|those|in|on|at|to|for|with|from|by|about|as|into|like|through|after|over|between|out|against|during|without|before|under|around|among|not|no|nor|and|but|or|so|if|because|when|while|where|how|why|what|which|who|whom|whose|always|usually|often|sometimes|never|every|day|yesterday|tomorrow|since|already|yet|just|ever|school|home|work|student|teacher|study|live|lives|lived|go|goes|went|gone|see|sees|saw|seen|play|plays|played|book|sun|water|earth|rises|east|speak|speaks|spoke|spoken|write|writes|wrote|written|read|reads|clean|happy|good|well|formula|present|simple|past|perfect|continuous|passive|voice|modal|verb)\b/i;
    const isLatin = /^[a-zA-Z0-9\s.,!?'"()\-:;/%+=]+$/.test(clean);
    return isLatin && englishWords.test(clean);
}

// Tách văn bản hỗn hợp thành các khối tiếng Việt và tiếng Anh riêng biệt
function splitBilingualText(text) {
    let cleanText = stripEmojisAndMarkdown(text);
    if (!cleanText) return [];

    const lines = cleanText.split(/\r?\n+/);
    const rawSegments = [];

    for (let line of lines) {
        line = line.replace(/^[*\-+0-9.)\s]+/g, '').trim();
        if (!line) continue;

        // Tách các cụm tiếng Anh trong ngoặc kép hoặc backticks
        const tokenRegex = /([`"'])([^`"'\n]+)\1/g;
        let lastIdx = 0;
        let match;
        let foundTokens = false;

        while ((match = tokenRegex.exec(line)) !== null) {
            foundTokens = true;
            const before = line.slice(lastIdx, match.index).trim();
            if (before) {
                rawSegments.push({ text: before, lang: isEnglishSentence(before) ? 'en-US' : 'vi-VN' });
            }
            const quoteContent = match[2].trim();
            if (isEnglishSentence(quoteContent)) {
                rawSegments.push({ text: quoteContent, lang: 'en-US' });
            } else {
                rawSegments.push({ text: quoteContent, lang: 'vi-VN' });
            }
            lastIdx = tokenRegex.lastIndex;
        }

        if (foundTokens) {
            const rest = line.slice(lastIdx).trim();
            if (rest) {
                rawSegments.push({ text: rest, lang: isEnglishSentence(rest) ? 'en-US' : 'vi-VN' });
            }
        } else {
            // Tách các câu ví dụ đứng sau dấu hai chấm (Ví dụ: "She goes to school...")
            const colonIdx = line.indexOf(':');
            if (colonIdx !== -1 && colonIdx < line.length - 3) {
                const prefix = line.slice(0, colonIdx + 1).trim();
                const suffix = line.slice(colonIdx + 1).trim();
                if (isEnglishSentence(suffix)) {
                    rawSegments.push({ text: prefix, lang: 'vi-VN' });
                    rawSegments.push({ text: suffix, lang: 'en-US' });
                    continue;
                }
            }

            // Tách từng câu nhỏ
            const sentences = line.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [line];
            for (let s of sentences) {
                const sent = s.trim();
                if (!sent) continue;
                rawSegments.push({ text: sent, lang: isEnglishSentence(sent) ? 'en-US' : 'vi-VN' });
            }
        }
    }

    // Gộp các đoạn liền nhau cùng ngôn ngữ để giọng đọc liền mạch, tự nhiên
    const merged = [];
    for (let seg of rawSegments) {
        if (!seg.text || seg.text.length < 1) continue;
        if (merged.length > 0 && merged[merged.length - 1].lang === seg.lang) {
            merged[merged.length - 1].text += ' ' + seg.text;
        } else {
            merged.push({ text: seg.text, lang: seg.lang });
        }
    }

    return merged;
}

// Helper: Lọc bỏ emoji và markdown syntax để Web Speech API không phát âm chữ "lấp lánh", "sao Thổ", "tên lửa"...
function stripEmojisAndMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/[*#_~`>]/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/<[^>]*>/g, '')
        // Lọc toàn bộ unicode emoji / pictographs
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Helper: Đọc câu trả lời song ngữ mượt mà bằng giọng bản ngữ chuẩn cho từng phần
function speakCleanText(text, forcedEnglish = false) {
    if (!window.speechSynthesis) return;
    if (typeof AITutor !== 'undefined' && !AITutor.ttsEnabled) return;
    window.speechSynthesis.cancel();

    if (forcedEnglish) {
        const clean = stripEmojisAndMarkdown(text).slice(0, 800);
        if (!clean) return;
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = 'en-US';
        const enV = findBestVoice('en');
        if (enV) utter.voice = enV;
        utter.rate = 0.95;
        window.speechSynthesis.speak(utter);
        return;
    }

    const segments = splitBilingualText(text);
    if (!segments || segments.length === 0) return;

    const viVoice = findBestVoice('vi');
    const enVoice = findBestVoice('en');

    let totalChars = 0;
    for (const seg of segments) {
        if (totalChars > 1500) break; // Giới hạn độ dài để trải nghiệm âm thanh mượt mà
        totalChars += seg.text.length;

        const utter = new SpeechSynthesisUtterance(seg.text);
        if (seg.lang === 'en-US') {
            utter.lang = 'en-US';
            if (enVoice) utter.voice = enVoice;
            utter.rate = 0.92; // Tốc độ chuẩn, rõ từng âm tiết tiếng Anh
            utter.pitch = 1.0;
        } else {
            utter.lang = 'vi-VN';
            if (viVoice) utter.voice = viVoice;
            utter.rate = 1.05; // Tốc độ tiếng Việt tự nhiên
            utter.pitch = 1.0;
        }
        window.speechSynthesis.speak(utter);
    }
}

// ----------------------------------------------------
// BỘ TRÍ TUỆ HỌC THUẬT & TRÍ NHỚ NGỮ CẢNH ĐA LƯỢT CLIENT-SIDE
// (Đảm bảo file HTML hoạt động độc lập 100% không bắt buộc server)
// ----------------------------------------------------
function clientExtractTopicFromHistory(history = []) {
    if (!Array.isArray(history) || history.length === 0) return null;
    const recent = history.slice(-6).reverse();
    for (const item of recent) {
        const txt = (item.content || '').toLowerCase();
        if (/phiên\s*mã|transcription/i.test(txt)) return { subject: 'biology', topic: 'phiên mã' };
        if (/dịch\s*mã|translation/i.test(txt)) return { subject: 'biology', topic: 'dịch mã' };
        if (/nhân\s*đôi\s*adn|tái\s*bản\s*adn/i.test(txt)) return { subject: 'biology', topic: 'nhân đôi adn' };
        if (/vận\s*chuyển\s*bị\s*động|vận\s*chuyển\s*chủ\s*động/i.test(txt)) return { subject: 'biology', topic: 'vận chuyển màng' };
        if (/tần\s*số\s*alen|quần\s*thể|hardy/i.test(txt)) return { subject: 'biology', topic: 'tần số alen' };
        if (/chu\s*kỳ\s*tế\s*bào|nguyên\s*phân/i.test(txt)) return { subject: 'biology', topic: 'chu kỳ tế bào' };
        if (/hiện\s*tại\s*đơn|present\s*simple/i.test(txt)) return { subject: 'english', topic: 'hiện tại đơn' };
        if (/hiện\s*tại\s*hoàn\s*thành|present\s*perfect/i.test(txt)) return { subject: 'english', topic: 'hiện tại hoàn thành' };
        if (/quá\s*khứ\s*đơn|past\s*simple/i.test(txt)) return { subject: 'english', topic: 'quá khứ đơn' };
        if (/câu\s*bị\s*động|passive\s*voice/i.test(txt)) return { subject: 'english', topic: 'câu bị động' };
        if (/câu\s*điều\s*kiện|conditional/i.test(txt)) return { subject: 'english', topic: 'câu điều kiện' };
        if (/este|lipit|chất\s*béo|xà\s*phòng/i.test(txt)) return { subject: 'chemistry', topic: 'este lipit' };
        if (/amino\s*axit|peptit|protein|glucoz/i.test(txt)) return { subject: 'chemistry', topic: 'amino axit' };
        if (/thể\s*tích\s*khí|đktc/i.test(txt)) return { subject: 'chemistry', topic: 'thể tích khí' };
        if (/dao\s*động\s*điều\s*hòa|con\s*lắc/i.test(txt)) return { subject: 'physics', topic: 'dao động điều hòa' };
        if (/quang\s*điện|phôtôn/i.test(txt)) return { subject: 'physics', topic: 'quang điện' };
        if (/khối\s*chóp|lăng\s*trụ|khối\s*nón/i.test(txt)) return { subject: 'math', topic: 'hình học không gian' };
        if (/đạo\s*hàm|cực\s*trị/i.test(txt)) return { subject: 'math', topic: 'đạo hàm' };
        if (/tích\s*phân|nguyên\s*hàm/i.test(txt)) return { subject: 'math', topic: 'tích phân' };
        if (/bài\s*thơ\s*sóng|vợ\s*chồng\s*a\s*phủ|vợ\s*nhặt/i.test(txt)) return { subject: 'literature', topic: 'ngữ văn' };
    }
    const lastUserTurn = recent.find(m => m.role === 'user');
    if (lastUserTurn && lastUserTurn.content) {
        return { subject: 'general', topic: lastUserTurn.content.slice(0, 30) };
    }
    return null;
}

async function clientGenerateSmartContextualReply(message, mode = 'general', history = []) {
    const text = (message || '').toLowerCase().trim();

    // 1. Phép tính số học trực tiếp
    try {
        let s = text.replace(/^(tính|kết quả của|phép tính|giải|tính giúp|cho hỏi|kết quả|giá trị của)\s+/i, '').replace(/[\?\=\:\s]+$/g, '').trim();
        const pctMatch = s.match(/^(\d+(?:\.\d+)?)\s*%\s*(?:của|\*)\s*(\d+(?:\.\d+)?)$/i);
        if (pctMatch) {
            const p = parseFloat(pctMatch[1]);
            const total = parseFloat(pctMatch[2]);
            return `**Kết quả phép tính:**\n\n👉 **${p}% của ${total} = ${(p / 100) * total}**\n\n• Phép tính được tính toán chính xác trực tiếp.`;
        }
        let expr = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/:/g, '/').replace(/\^/g, '**');
        if (/^[\d\s\+\-\*\/\%\.\(\)]+$/.test(expr) && /[\+\-\*\/]/.test(expr)) {
            const val = Function('"use strict"; return (' + expr + ')')();
            if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
                return `**Kết quả phép tính:**\n\n👉 **${s} = ${Math.round(val * 1000000) / 1000000}**\n\n• Phép tính được giải trực tiếp.`;
            }
        }
    } catch(e) {}

    // 2. Phân tích ngữ cảnh đa lượt
    const prevContext = clientExtractTopicFromHistory(history);
    const isFollowUp = /(^|\s)(thế còn|còn|vậy còn|vậy thì|thế thì|tiếp theo|nữa không|thêm|cho ví dụ|ví dụ|thử cho|bài tập|tại sao|vì sao|sao lại|giải thích|làm rõ|rõ hơn|chi tiết hơn|ý trên|câu trên|ý này|phần này|cái này|cái đó|ở đâu|khi nào|đúng không|so sánh|khác nhau|giống nhau|có mấy|nhân thực|nhân sơ)\b/i.test(text)
        || text.split(/\s+/).length <= 4;

    if (prevContext && isFollowUp) {
        if (prevContext.topic === 'phiên mã') {
            if (/nhân\s*thực|eukaryot/i.test(text)) {
                return `### 🧬 QUÁ TRÌNH PHIÊN MÃ Ở SINH VẬT NHÂN THỰC (EUKARYOTES)\n\nTiếp nối câu hỏi trước về sinh vật nhân sơ, ở **sinh vật nhân thực**, quá trình phiên mã có những điểm khác biệt và phức tạp hơn rất nhiều:\n\n• **1. Vị trí & Thời gian:** Diễn ra chủ yếu trong **nhân tế bào** (pha G1, G2 kỳ trung gian), ngoài ra có ở ti thể và lục lạp. **Không diễn ra đồng thời với dịch mã**.\n• **2. Enzim ARN polimeraza (3 loại):** ARN pol I (tổng hợp rARN), ARN pol II (mARN sơ khai), ARN pol III (tARN và rARN 5S).\n• **3. Gen phân mảnh & Chế bản mARN:** Chứa xen kẽ **exon** (mang mã) và **intron** (không mang mã). mARN sơ khai phải **cắt bỏ intron, nối exon, gắn mũ 5' và đuôi poly-A** để tạo **mARN trưởng thành** rồi mới chui qua lỗ màng nhân ra tế bào chất.`;
            }
            if (/so\s*sánh|khác\s*nhau|giống\s*nhau/i.test(text)) {
                return `### 🧬 SO SÁNH PHIÊN MÃ: NHÂN SƠ VS NHÂN THỰC\n\n• **Giống nhau:** Đều dựa trên mạch mã gốc (3'->5') của gen, tổng hợp mARN theo chiều 5'->3', tuân theo nguyên tắc bổ sung (A-U, T-A, G-X, X-G).\n• **Khác nhau:**\n  - Nhân sơ: Diễn ra ở tế bào chất, 1 loại ARN polimeraza, gen không phân mảnh, phiên mã và dịch mã đồng thời.\n  - Nhân thực: Diễn ra trong nhân, 3 loại ARN polimeraza, gen phân mảnh (phải cắt intron, nối exon), phiên mã và dịch mã diễn ra tách biệt.`;
            }
            if (/ví\s*dụ|bài\s*tập/i.test(text)) {
                return `### 📝 BÀI TẬP VẬN DỤNG: PHIÊN MÃ\n\n**Câu hỏi:** Một mạch mã gốc có trình tự: \`3' - T A X G G A T T A - 5'\`. Đoạn mARN tương ứng là gì?\n👉 **Đáp án:** \`5' - A U G X X U A A U - 3'\` *(Nguyên tắc bổ sung: T-A, A-U, X-G, G-X)*.`;
            }
        }

        if (prevContext.topic === 'hiện tại đơn') {
            if (/ví\s*dụ|bài\s*tập/i.test(text)) {
                return `### 📝 BÀI TẬP VẬN DỤNG: THÌ HIỆN TẠI ĐƠN\n\n**Câu 1:** She usually _______ (go) to school by bike. ➔ **goes** *(She là ngôi thứ ba số ít, go tận cùng là o nên thêm -es)*.\n**Câu 2:** _______ they like reading books? ➔ **Do** *(Chủ ngữ they số nhiều nên mượn trợ động từ Do)*.\n**Câu 3:** The sun _______ (rise) in the East. ➔ **rises** *(Chân lý hiển nhiên)*.`;
            }
        }

        if (/tại\s*sao|vì\s*sao|sao\s*lại|giải\s*thích\s*rõ/i.test(text)) {
            return `### 💡 GIẢI THÍCH CHI TIẾT BẢN CHẤT: "${prevContext.topic.toUpperCase()}"\n\nChào bạn! Để nắm vững kiến thức này một cách tự nhiên nhất:\n1. **Cơ chế cốt lõi:** Luôn xác định điều kiện tiền đề (môi trường, không gian tế bào, nguyên tắc ghép đôi).\n2. **Mẹo làm bài thi:** Nhớ các từ khóa then chốt và các trường hợp ngoại lệ để không bị đề thi đánh đố.\n\n👉 *Bạn có bài tập trắc nghiệm hay tự luận cụ thể nào cần giải ngay không? Gửi đề cho mình nhé!*`;
        }
    }

    // 3. Phân loại theo môn học & chủ đề chuẩn THPT
    if (/phiên\s*mã|transcription/i.test(text)) {
        if (/nhân\s*thực|eukaryot/i.test(text) && !/nhân\s*sơ/i.test(text)) {
            return `### 🧬 TÓM TẮT: QUÁ TRÌNH PHIÊN MÃ Ở SINH VẬT NHÂN THỰC\n\n• **Vị trí:** Trong nhân tế bào (ở pha G1, G2 kỳ trung gian).\n• **Enzim:** 3 loại ARN polimeraza (I, II, III).\n• **Chế bản mARN:** Cắt bỏ intron, nối các exon, gắn mũ 5' và đuôi poly-A tạo mARN trưởng thành rồi mới dịch mã ngoài tế bào chất.`;
        }
        return `### 🧬 TÓM TẮT: QUÁ TRÌNH PHIÊN MÃ (TRANSCRIPTION)\n\n• **Bản chất:** Tổng hợp ARN từ mạch mã gốc của gen (3'->5') theo nguyên tắc bổ sung, chiều tổng hợp mARN luôn là 5'->3'.\n• **Ở sinh vật nhân sơ:** Diễn ra tại tế bào chất, chỉ dùng 1 loại enzim ARN polimeraza, gen không phân mảnh nên mARN tạo ra dịch mã được ngay (phiên mã và dịch mã đồng thời).`;
    }

    if (/dịch\s*mã|translation/i.test(text)) {
        return `### 🧬 TÓM TẮT: QUÁ TRÌNH DỊCH MÃ (TRANSLATION)\n\n• **Bản chất:** Tổng hợp chuỗi polipeptit tại Riboxom trong tế bào chất.\n• **Codon mở đầu:** 5'AUG3' (Met ở nhân thực, fMet ở nhân sơ).\n• **Codon kết thúc:** 5'UAA3', 5'UAG3', 5'UGA3' (dừng dịch mã, không mã hóa axit amin).`;
    }

    if (/vận\s*chuyển\s*bị\s*động|vận\s*chuyển\s*chủ\s*động|thẩm\s*thấu|khuếch\s*tán/i.test(text)) {
        return `### 🧬 SINH HỌC: VẬN CHUYỂN QUA MÀNG SINH CHẤT\n\n• **Bị động:** Xuôi chiều gradien nồng độ, **không tốn ATP** (khuếch tán qua lớp photpholipit kép hoặc kênh protein, thẩm thấu của nước).\n• **Chủ động:** Ngược chiều gradien nồng độ, **tiêu tốn ATP** và cần protein chất mang (ví dụ: bơm Na+/K+).`;
    }

    if (/tần\s*số\s*alen|quần\s*thể|hardy|hacđi/i.test(text)) {
        return `### 🧬 DI TRUYỀN QUẦN THỂ & HARDY - WEINBERG\n\n• **Công thức cân bằng di truyền:** \`p² AA + 2pq Aa + q² aa = 1\` với \`p(A) + q(a) = 1\`.\n• **Tần số alen:** \`p(A) = d + h/2\`, \`q(a) = r + h/2\` (với cấu trúc \`d AA + h Aa + r aa = 1\`).`;
    }

    if (/thể\s*tích\s*khí|đktc|lít\s*khí|thể\s*tích\s*(co2|h2|o2|n2)/i.test(text)) {
        return `### 🧪 HÓA HỌC: THỂ TÍCH KHÍ & SỐ MOL\n\n• Ở đktc (0°C, 1 atm): \`V = n · 22.4\` (lít) ➔ \`n = V / 22.4\` (mol).\n• Ở điều kiện chuẩn mới (25°C, 1 bar): \`V = n · 24.79\` (lít).\n• Nồng độ mol: \`C_M = n / V_dd\` ➔ \`n = C_M · V_dd\`.`;
    }

    if (/este|lipit|chất\s*béo|xà\s*phòng/i.test(text)) {
        return `### 🧪 TRỌNG TÂM HÓA HỌC 12: ESTE - LIPIT\n\n1. **Xà phòng hóa este thông thường:** \`RCOOR' + NaOH -(t°)-> RCOONa + R'OH\`\n2. **Este của phenol:** \`RCOOC₆H₅ + 2NaOH -(t°)-> RCOONa + C₆H₅ONa + H₂O\` *(tỉ lệ 1:2, sinh 2 muối, không sinh ancol)*.\n3. **Chất béo (Triglycerit):** Tristearin \`(C₁₇H₃₅COO)₃C₃H₅\` (rắn), Triolein \`(C₁₇H₃₃COO)₃C₃H₅\` (lỏng).`;
    }

    if (/hiện\s*tại\s*đơn|present\s*simple/i.test(text)) {
        return `### 📘 THÌ HIỆN TẠI ĐƠN (PRESENT SIMPLE)\n\n• **Với To Be:** \`S + am / is / are + ...\`\n• **Với V thường:**\n  - Khẳng định (+): \`S + V(nguyên thể/s/es)\` *(He/She/It: V-s/es; Mẹo thêm -es: O, S, X, Z, CH, SH - "Ông Sáu Chạy Xe Sh Zỏm")*.\n  - Phủ định (-): \`S + do not (don't) / does not (doesn't) + V_bare\`.\n  - Nghi vấn (?): \`Do / Does + S + V_bare?\`\n• **Dấu hiệu:** *always, usually, often, every day, once a week*.`;
    }

    if (/hiện\s*tại\s*hoàn\s*thành|present\s*perfect/i.test(text)) {
        return `### 📘 THÌ HIỆN TẠI HOÀN THÀNH (PRESENT PERFECT)\n\n• **Công thức:** \`S + have / has + V3/ed\`\n• **Dấu hiệu:** \`since + mốc thời gian\` (*since 2020*), \`for + khoảng thời gian\` (*for 3 years*), *already, yet, just, ever, never*.`;
    }

    if (/quang\s*điện|lượng\s*tử\s*ánh\s*sáng|phôtôn/i.test(text)) {
        return `### ⚡ HIỆN TƯỢNG QUANG ĐIỆN & THUYẾT LƯỢNG TỬ\n\n• **Điều kiện xảy ra:** Bước sóng ánh sáng \`λ ≤ λ₀ = (hc) / A\` (năng lượng phôtôn \`ε = hf ≥ A\`).\n• **Năng lượng phôtôn:** \`ε = hf = (hc)/λ\` (h = 6.625·10⁻³⁴ J.s).`;
    }

    if (/dao\s*động\s*điều\s*hòa|con\s*lắc/i.test(text) && !/tế\s*bào|alen|gen/i.test(text)) {
        return `### ⚡ DAO ĐỘNG ĐIỀU HÒA\n\n• Phương trình: \`x = A · cos(ωt + φ)\`\n• Vận tốc: \`v = -ωA · sin(ωt + φ)\` (sớm pha π/2 so với x).\n• Gia tốc: \`a = -ω²x\` (ngược pha với x).\n• Con lắc lò xo: \`ω = √(k/m)\`, \`T = 2π√(m/k)\`. Con lắc đơn: \`ω = √(g/l)\`, \`T = 2π√(l/g)\`.`;
    }

    if (/(khối\s*chóp|lăng\s*trụ|khối\s*nón|khối\s*trụ|khối\s*cầu)/i.test(text) && !/khí|dung\s*dịch/i.test(text)) {
        return `### 📐 HÌNH HỌC KHÔNG GIAN 12\n\n• Khối chóp: \`V = (1/3) · S_đáy · h\`\n• Khối lăng trụ: \`V = S_đáy · h\`\n• Khối nón: \`V = (1/3) · π · r² · h\`, \`S_xq = π · r · l\`\n• Khối trụ: \`V = π · r² · h\`, \`S_xq = 2 · π · r · h\`\n• Khối cầu: \`V = (4/3) · π · R³\`, \`S = 4 · π · R²\`.`;
    }

    if (/cảm\s*ơn|thanks|tốt\s*quá/i.test(text)) {
        return `Không có gì đâu bạn ơi! Eduvia AI luôn sẵn sàng đồng hành cùng bạn trên con đường học tập. Cứ gửi bài tập cho mình bất cứ lúc nào nhé!`;
    }

    // Tra cứu nhanh Wikipedia trực tiếp trên trình duyệt
    try {
        const cleanQ = encodeURIComponent(message.replace(/[\?\.\!]+$/g, '').trim());
        const wikiRes = await fetch(`https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${cleanQ}&format=json&origin=*`);
        if (wikiRes.ok) {
            const wikiData = await wikiRes.json();
            const firstHit = wikiData?.query?.search?.[0];
            if (firstHit && firstHit.snippet) {
                const cleanSnippet = firstHit.snippet.replace(/<[^>]*>/g, '').trim();
                return `### 💡 TÓM TẮT: ${firstHit.title.toUpperCase()}\n\n• **Bản chất cốt lõi:**\n  ${cleanSnippet}.\n\n👉 *Bạn có bài tập số liệu hoặc câu trắc nghiệm về phần này không? Gửi ngay cho mình nhé!*`;
            }
        }
    } catch(e) {}

    return `### 💡 TÓM TẮT: "${message.toUpperCase()}"\n\n• **Khái niệm cốt lõi:**\n  Đây là nội dung trọng tâm trong chương trình học. Bản chất nằm ở việc nắm vững nguyên lý hoạt động và điều kiện diễn ra hiện tượng.\n\n👉 *Gửi đề bài chi tiết để mình giải từng bước cho bạn nhé!*`;
}

// ----------------------------------------------------
// 2. AI TUTOR & FLOATING CHATBOT & VOICE MANAGER
// ----------------------------------------------------
const AITutor = {
    activeMode: 'general', // 'general' | 'english_speaking' | 'companion' | 'homework'
    attachedFile: null,
    speechRecognition: null,
    isRecording: false,
    ttsEnabled: true,
    history: [],

    init: () => {
        // Khởi tạo SpeechRecognition nếu trình duyệt hỗ trợ
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
            AITutor.speechRecognition = new SpeechRec();
            AITutor.speechRecognition.continuous = false;
            AITutor.speechRecognition.interimResults = true; // Cho phép hiển thị chữ theo thời gian thực khi nói

            AITutor.speechRecognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                const input = document.getElementById('aichat-input');
                const floatingInput = document.getElementById('floating-ai-input');
                const textToShow = finalTranscript || interimTranscript;
                if (input && textToShow) input.value = textToShow;
                if (floatingInput && textToShow) floatingInput.value = textToShow;

                if (finalTranscript.trim()) {
                    AITutor.onVoiceResult(finalTranscript.trim());
                }
            };

            AITutor.speechRecognition.onerror = (event) => {
                console.warn('Speech recognition error:', event.error);
                AITutor.stopRecordingAnimation();
                if (event.error === 'not-allowed') {
                    alert('Quyền Microphone đã bị chặn. Vui lòng nhấn vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ trình duyệt và chọn "Cho phép Micro".');
                    const modal = document.getElementById('modal-mic-permission');
                    if (modal) modal.style.display = 'flex';
                } else if (event.error === 'no-speech') {
                    const input = document.getElementById('aichat-input');
                    if (input && !input.value) {
                        input.placeholder = 'Chưa nghe rõ giọng nói. Bạn hãy nói gần Micro hơn hoặc gõ câu hỏi nhé...';
                    }
                } else if (event.error === 'network') {
                    alert('Tính năng nhận diện giọng nói Web Speech cần kết nối mạng. Bạn có thể gõ câu hỏi trực tiếp để gia sư giải đáp nhé!');
                }
            };

            AITutor.speechRecognition.onend = () => {
                AITutor.stopRecordingAnimation();
            };
        }

        // Tải lịch sử trò chuyện đã lưu để đồng bộ xuyên suốt Dashboard và Gia Sư AI
        try {
            const saved = sessionStorage.getItem('eduvia_ai_chat_history');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    AITutor.history = parsed;
                    const container = document.getElementById('aichat-messages-box');
                    if (container && container.children.length <= 1) {
                        AITutor.renderFullHistoryToBox();
                    }
                    const lastUser = [...AITutor.history].reverse().find(m => m.role === 'user');
                    const lastAi = [...AITutor.history].reverse().find(m => m.role === 'model');
                    if (lastUser && lastAi) {
                        const bubble = document.getElementById('dash-siri-text');
                        if (bubble) {
                            let formatted = lastAi.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                            bubble.innerHTML = `
                                <div style="font-size:12px; color:var(--clr-text-muted); margin-bottom:4px;"><strong>Bạn:</strong> "${lastUser.content}"</div>
                                <div style="font-size:13px; line-height:1.6; max-height:220px; overflow-y:auto; padding-right:4px;"><strong>Eduvia AI:</strong><br>${formatted}</div>
                                <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
                                    <button onclick="switchView('aichat')" style="background:rgba(59,130,246,0.18); border:1px solid rgba(59,130,246,0.4); color:#93c5fd; border-radius:6px; font-size:11px; padding:3px 10px; cursor:pointer; font-weight:600;">
                                        💬 Mở toàn màn hình Gia Sư AI & hỏi tiếp
                                    </button>
                                </div>
                            `;
                        }
                    }
                }
            }
        } catch(e) {}
    },

    setMode: (mode) => {
        AITutor.activeMode = mode;
        ['general', 'english', 'companion', 'homework'].forEach(m => {
            const chip = document.getElementById(`chip-mode-${m}`);
            if (chip) chip.classList.remove('active');
        });
        const activeChip = document.getElementById(`chip-mode-${mode === 'english_speaking' ? 'english' : mode}`);
        if (activeChip) activeChip.classList.add('active');

        const desc = document.getElementById('aichat-mode-desc');
        const input = document.getElementById('aichat-input');

        if (mode === 'english_speaking') {
            if (desc) desc.textContent = 'Luyện nói Tiếng Anh phản xạ: Bật mic nói chuyện để AI sửa phát âm, ngữ pháp và đối thoại.';
            if (input) input.placeholder = 'Nói hoặc gõ bằng tiếng Anh: "Hi tutor, let\'s practice speaking today..."';
        } else if (mode === 'companion') {
            if (desc) desc.textContent = 'Trạm Tâm Sự Cảm Xúc: Giãi bày áp lực thi cử, căng thẳng học tập và nhận sự đồng cảm.';
            if (input) input.placeholder = 'Gõ tâm sự hoặc điều đang khiến bạn lo lắng hôm nay...';
        } else if (mode === 'homework') {
            if (desc) desc.textContent = 'Gia Sư Giải Bài Tập: Nhận diện ảnh chụp bài tập, công thức và hướng dẫn phương pháp giải.';
            if (input) input.placeholder = 'Hỏi bài tập hoặc nhấn nút đính kèm 📎 để tải ảnh đề bài lên...';
        } else {
            if (desc) desc.textContent = 'Trợ lý học tập tổng hợp: Giải đáp kiến thức mọi môn học và tư vấn phương pháp.';
            if (input) input.placeholder = 'Nhập câu hỏi hoặc nhấn Micro để nói...';
        }
    },

    toggleFloatingDrawer: (forceOpen) => {
        const drawer = document.getElementById('floating-ai-drawer');
        if (!drawer) return;
        if (typeof forceOpen === 'boolean') {
            drawer.classList.toggle('open', forceOpen);
        } else {
            drawer.classList.toggle('open');
        }
    },

    requestMicPermission: async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            closeModals();
            alert('🎙️ Đã cấp quyền Microphone thành công! Bạn có thể bắt đầu tương tác bằng giọng nói.');
            AITutor.toggleMicRecording();
        } catch(e) {
            alert('Không thể truy cập Microphone. Vui lòng cho phép quyền trong cài đặt trình duyệt.');
        }
    },

    toggleMicRecording: async (isFloating = false) => {
        if (!AITutor.speechRecognition) {
            alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói Web Speech. Bạn có thể sử dụng Chrome hoặc Edge để trải nghiệm tốt nhất!');
            return;
        }

        if (AITutor.isRecording) {
            AITutor.speechRecognition.stop();
            AITutor.stopRecordingAnimation();
        } else {
            // Yêu cầu quyền Micro chủ động để tránh lỗi âm thầm từ chối
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(t => t.stop()); // Giải phóng stream ngay để SpeechRecognition sử dụng
                } catch(err) {
                    console.warn('Mic permission error:', err);
                    alert('Vui lòng cho phép quyền truy cập Microphone trong trình duyệt để sử dụng tính năng nói!');
                    const modal = document.getElementById('modal-mic-permission');
                    if (modal) modal.style.display = 'flex';
                    return;
                }
            }

            try {
                // Đặt ngôn ngữ nhận diện phù hợp
                if (AITutor.activeMode === 'english_speaking') {
                    AITutor.speechRecognition.lang = 'en-US';
                } else {
                    AITutor.speechRecognition.lang = 'vi-VN';
                }

                AITutor.speechRecognition.start();
                AITutor.isRecording = true;
                AITutor.startRecordingAnimation(isFloating);
            } catch(e) {
                console.error('Error starting mic:', e);
                const modal = document.getElementById('modal-mic-permission');
                if (modal) modal.style.display = 'flex';
            }
        }
    },

    startRecordingAnimation: (isFloating) => {
        const btn = document.getElementById('btn-aichat-mic');
        if (btn) {
            btn.style.background = '#ef4444';
            btn.style.boxShadow = '0 0 20px #ef4444';
            btn.innerHTML = '🔴 Đang nghe...';
        }
        const input = document.getElementById('aichat-input');
        if (input) input.placeholder = 'Đang lắng nghe giọng nói của bạn... Hãy nói câu hỏi vào micro!';
    },

    stopRecordingAnimation: () => {
        AITutor.isRecording = false;
        const btn = document.getElementById('btn-aichat-mic');
        if (btn) {
            btn.style.background = '';
            btn.style.boxShadow = '';
            btn.innerHTML = '🎙️';
        }
        const input = document.getElementById('aichat-input');
        if (input && !input.value) {
            input.placeholder = 'Nhập câu hỏi hoặc nhấn Micro để nói...';
        }
    },

    onVoiceResult: (transcript) => {
        const input = document.getElementById('aichat-input');
        const floatingInput = document.getElementById('floating-ai-input');
        if (input) input.value = transcript;
        if (floatingInput) floatingInput.value = transcript;

        // Tự động gửi nếu đang ở chế độ luyện nói tiếng Anh
        if (AITutor.activeMode === 'english_speaking') {
            AITutor.sendMessage();
        }
    },

    handleFileUpload: (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEvt) => {
            AITutor.attachedFile = {
                name: file.name,
                mimeType: file.type || 'image/jpeg',
                data: loadEvt.target.result
            };

            const bar = document.getElementById('ai-file-preview-bar');
            const thumb = document.getElementById('ai-file-thumb');
            const nameEl = document.getElementById('ai-file-name');

            if (bar && thumb && nameEl) {
                bar.style.display = 'flex';
                thumb.src = loadEvt.target.result;
                nameEl.textContent = file.name;
            }
            AITutor.setMode('homework');
        };
        reader.readAsDataURL(file);
    },

    clearAttachedFile: () => {
        AITutor.attachedFile = null;
        const bar = document.getElementById('ai-file-preview-bar');
        const fileInput = document.getElementById('ai-file-input');
        if (bar) bar.style.display = 'none';
        if (fileInput) fileInput.value = '';
    },

    toggleTTS: () => {
        AITutor.ttsEnabled = !AITutor.ttsEnabled;
        const statusText = document.getElementById('tts-status-text');
        if (statusText) statusText.textContent = AITutor.ttsEnabled ? 'Bật' : 'Tắt';
        if (!AITutor.ttsEnabled && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    },

    speak: (text, isEnglish = false) => {
        speakCleanText(text, isEnglish);
    },

    handleKeyDown: (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            AITutor.sendMessage();
        }
    },

    sendMessage: async () => {
        const input = document.getElementById('aichat-input');
        const message = input ? input.value.trim() : '';
        const fileData = AITutor.attachedFile;

        if (!message && !fileData) return;

        // Render user message bubble
        AITutor.appendMessage('user', message, fileData?.data);
        if (input) input.value = '';

        // Clear file attachment
        AITutor.clearAttachedFile();

        // Loading message
        const loadingId = 'ai-loading-' + Date.now();
        AITutor.appendMessage('ai', 'Eduvia AI đang suy nghĩ và phân tích dữ liệu...', null, loadingId);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    fileData,
                    mode: AITutor.activeMode,
                    history: AITutor.history
                })
            });
            const data = await res.json();
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();

            if (data.success && data.reply) {
                AITutor.appendMessage('ai', data.reply);
                AITutor.history.push({ role: 'user', content: message });
                AITutor.history.push({ role: 'model', content: data.reply });

                try {
                    sessionStorage.setItem('eduvia_ai_chat_history', JSON.stringify(AITutor.history.slice(-30)));
                } catch(e) {}

                // Cập nhật bong bóng Dashboard Siri nếu đang ở Dashboard
                const bubble = document.getElementById('dash-siri-text');
                if (bubble) {
                    let formatted = data.reply.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    bubble.innerHTML = `
                        <div style="font-size:12px; color:var(--clr-text-muted); margin-bottom:4px;"><strong>Bạn:</strong> "${message}"</div>
                        <div style="font-size:13px; line-height:1.6; max-height:220px; overflow-y:auto; padding-right:4px;"><strong>Eduvia AI:</strong><br>${formatted}</div>
                        <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
                            <button onclick="switchView('aichat')" style="background:rgba(59,130,246,0.18); border:1px solid rgba(59,130,246,0.4); color:#93c5fd; border-radius:6px; font-size:11px; padding:3px 10px; cursor:pointer; font-weight:600;">
                                💬 Mở toàn màn hình Gia Sư AI & hỏi tiếp
                            </button>
                        </div>
                    `;
                }

                // Voice Read Aloud if mode is english speaking
                if (AITutor.activeMode === 'english_speaking') {
                    AITutor.speak(data.reply, true);
                } else if (AITutor.ttsEnabled) {
                    AITutor.speak(data.reply, false);
                }
            } else {
                AITutor.appendMessage('ai', data.error || 'Eduvia AI chưa thể trả lời vào lúc này.');
            }
        } catch(e) {
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();

            // Client-side fallback: Hoạt động offline hoặc khi mở trực tiếp file HTML đơn lập (single-file)
            try {
                const clientReply = await clientGenerateSmartContextualReply(message, AITutor.activeMode, AITutor.history);
                AITutor.appendMessage('ai', clientReply);
                AITutor.history.push({ role: 'user', content: message });
                AITutor.history.push({ role: 'model', content: clientReply });

                try {
                    sessionStorage.setItem('eduvia_ai_chat_history', JSON.stringify(AITutor.history.slice(-30)));
                } catch(err) {}

                // Cập nhật bong bóng Dashboard Siri nếu đang hiển thị
                const bubble = document.getElementById('dash-siri-text');
                if (bubble) {
                    let formatted = clientReply.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    bubble.innerHTML = `
                        <div style="font-size:12px; color:var(--clr-text-muted); margin-bottom:4px;"><strong>Bạn:</strong> "${message}"</div>
                        <div style="font-size:13px; line-height:1.6; max-height:220px; overflow-y:auto; padding-right:4px;"><strong>Eduvia AI:</strong><br>${formatted}</div>
                        <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
                            <button onclick="switchView('aichat')" style="background:rgba(59,130,246,0.18); border:1px solid rgba(59,130,246,0.4); color:#93c5fd; border-radius:6px; font-size:11px; padding:3px 10px; cursor:pointer; font-weight:600;">
                                💬 Mở toàn màn hình Gia Sư AI & hỏi tiếp
                            </button>
                        </div>
                    `;
                }

                if (AITutor.activeMode === 'english_speaking') {
                    AITutor.speak(clientReply, true);
                } else if (AITutor.ttsEnabled) {
                    AITutor.speak(clientReply, false);
                }
            } catch(err2) {
                AITutor.appendMessage('ai', 'Có lỗi kết nối mạng tới Eduvia AI.');
            }
        }
    },

    sendFloatingMessage: async () => {
        const input = document.getElementById('floating-ai-input');
        const message = input ? input.value.trim() : '';
        if (!message) return;

        const stream = document.getElementById('floating-chat-stream');
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-msg user-msg';
        userDiv.innerHTML = `<div class="msg-bubble" style="font-size:13px;">${message}</div>`;
        stream.appendChild(userDiv);
        input.value = '';
        stream.scrollTop = stream.scrollHeight;

        // Đồng bộ tin nhắn người dùng vào lịch sử dùng chung
        AITutor.syncMessageToBox('user', message);
        AITutor.history.push({ role: 'user', content: message });

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-msg ai-msg';
        loadingDiv.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble" style="font-size:13px;">Đang suy nghĩ... ✨</div>`;
        stream.appendChild(loadingDiv);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    mode: AITutor.activeMode || 'general',
                    history: AITutor.history.slice(0, -1)
                })
            });
            const data = await res.json();
            loadingDiv.remove();

            const reply = data.reply || 'Eduvia AI luôn sẵn sàng đồng hành cùng bạn!';
            const aiDiv = document.createElement('div');
            aiDiv.className = 'chat-msg ai-msg';
            aiDiv.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble" style="font-size:13px;">${reply}</div>`;
            stream.appendChild(aiDiv);
            stream.scrollTop = stream.scrollHeight;

            // Đồng bộ phản hồi vào lịch sử dùng chung
            AITutor.history.push({ role: 'model', content: reply });
            try {
                sessionStorage.setItem('eduvia_ai_chat_history', JSON.stringify(AITutor.history.slice(-30)));
            } catch(e) {}
            AITutor.syncMessageToBox('ai', reply);
        } catch(e) {
            loadingDiv.remove();
            try {
                const clientReply = await clientGenerateSmartContextualReply(message, AITutor.activeMode || 'general', AITutor.history.slice(0, -1));
                const aiDiv = document.createElement('div');
                aiDiv.className = 'chat-msg ai-msg';
                aiDiv.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble" style="font-size:13px;">${clientReply}</div>`;
                stream.appendChild(aiDiv);
                stream.scrollTop = stream.scrollHeight;

                AITutor.history.push({ role: 'model', content: clientReply });
                try {
                    sessionStorage.setItem('eduvia_ai_chat_history', JSON.stringify(AITutor.history.slice(-30)));
                } catch(err) {}
                AITutor.syncMessageToBox('ai', clientReply);
            } catch(err2) {}
        }
    },

    renderFullHistoryToBox: () => {
        const container = document.getElementById('aichat-messages-box');
        if (!container) return;
        container.innerHTML = '';
        AITutor.history.forEach(item => {
            AITutor.appendMessage(item.role === 'user' ? 'user' : 'ai', item.content);
        });
    },

    syncMessageToBox: (role, text, imageSrc) => {
        const container = document.getElementById('aichat-messages-box');
        if (!container) return;
        AITutor.appendMessage(role, text, imageSrc);
    },

    appendMessage: (role, text, imageSrc, id) => {
        const container = document.getElementById('aichat-messages-box');
        if (!container) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${role}-msg`;
        if (id) msgDiv.id = id;

        let formattedText = text ? text.replace(/\n/g, '<br>') : '';
        // Bold formatting
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        let html = '';
        if (role === 'ai') {
            html += `<div class="msg-avatar">🤖</div>`;
        }
        html += `<div class="msg-bubble">`;
        if (imageSrc) {
            html += `<img src="${imageSrc}" style="max-width: 220px; border-radius: 8px; margin-bottom: 8px; display: block;" />`;
        }
        html += `${formattedText}</div>`;

        msgDiv.innerHTML = html;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    },

    clearHistory: () => {
        AITutor.history = [];
        try {
            sessionStorage.removeItem('eduvia_ai_chat_history');
        } catch(e) {}
        const box = document.getElementById('aichat-messages-box');
        if (box) {
            box.innerHTML = `
                <div class="chat-msg ai-msg">
                    <div class="msg-avatar">🤖</div>
                    <div class="msg-bubble">Lịch sử trò chuyện đã được làm sạch. Bạn muốn hỏi bài hoặc trò chuyện về điều gì tiếp theo nào? ✨</div>
                </div>
            `;
        }
        const bubble = document.getElementById('dash-siri-text');
        if (bubble) {
            bubble.innerHTML = '<strong>Chào bạn! Tôi là Eduvia AI 🪐</strong><br>Trợ lý học tập thông minh & gia sư giải đề. Bạn muốn hỏi bài gì hôm nay?';
        }
    }
};

window.setAiChatMode = (mode) => AITutor.setMode(mode);

// ----------------------------------------------------
// 2B. DASHBOARD SIRI ORB (HỎI ĐÁP & NÓI TRỰC TIẾP TRÊN DASHBOARD)
// ----------------------------------------------------
const DashboardSiri = {
    isListening: false,
    speechRec: null,

    init: () => {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
            DashboardSiri.speechRec = new SpeechRec();
            DashboardSiri.speechRec.continuous = false;
            DashboardSiri.speechRec.interimResults = true; // Hiển thị chữ thời gian thực khi nói
            DashboardSiri.speechRec.lang = 'vi-VN';

            DashboardSiri.speechRec.onstart = () => {
                DashboardSiri.isListening = true;
                const orb = document.getElementById('dash-siri-orb');
                const mic = document.getElementById('dash-siri-mic');
                const bubble = document.getElementById('dash-siri-text');
                if (orb) orb.classList.add('listening');
                if (mic) {
                    mic.style.background = '#ef4444';
                    mic.style.borderColor = '#ef4444';
                    mic.style.boxShadow = '0 0 15px #ef4444';
                }
                if (bubble) bubble.innerHTML = '<strong>Đang lắng nghe bạn nói... 🎙️</strong><br><span style="color:var(--clr-cyan-soft);">Hãy đặt câu hỏi bài tập hoặc trò chuyện cùng Eduvia AI nhé!</span>';
            };

            DashboardSiri.speechRec.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                const input = document.getElementById('dash-siri-input');
                const bubble = document.getElementById('dash-siri-text');
                const textToShow = finalTranscript || interimTranscript;
                if (input && textToShow) input.value = textToShow;
                if (bubble && textToShow) {
                    bubble.innerHTML = `<strong>Đang nghe:</strong> "${textToShow}..."`;
                }

                if (finalTranscript.trim()) {
                    DashboardSiri.sendQuestion(finalTranscript.trim());
                }
            };

            DashboardSiri.speechRec.onerror = (e) => {
                console.warn('Siri speech error:', e.error);
                DashboardSiri.stopListening();
                const bubble = document.getElementById('dash-siri-text');
                if (e.error === 'not-allowed') {
                    if (bubble) bubble.innerHTML = '<strong>Cần cấp quyền Microphone 🎙️</strong><br>Vui lòng cho phép quyền truy cập Micro trên trình duyệt để nói chuyện cùng Eduvia AI!';
                    alert('Quyền Microphone đã bị chặn. Vui lòng nhấn vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ trình duyệt và chọn "Cho phép Micro".');
                } else if (e.error === 'no-speech') {
                    if (bubble) bubble.innerHTML = '<strong>Chưa nghe rõ giọng nói 🎙️</strong><br>Bạn hãy nói gần micro hơn hoặc gõ câu hỏi vào ô bên dưới nhé!';
                } else if (e.error === 'network') {
                    if (bubble) bubble.innerHTML = '<strong>Lỗi kết nối mạng 🌐</strong><br>Bạn có thể gõ câu hỏi trực tiếp vào ô bên dưới nhé!';
                }
            };

            DashboardSiri.speechRec.onend = () => {
                DashboardSiri.stopListening();
            };
        }
    },

    toggleVoiceListening: async () => {
        if (!DashboardSiri.speechRec) {
            alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói Web Speech hoặc chưa cấp quyền Micro. Bạn hãy gõ câu hỏi vào thanh bên dưới nhé!');
            const input = document.getElementById('dash-siri-input');
            if (input) input.focus();
            return;
        }

        if (DashboardSiri.isListening) {
            DashboardSiri.speechRec.stop();
            DashboardSiri.stopListening();
        } else {
            // Yêu cầu quyền Micro chủ động
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(t => t.stop());
                } catch(err) {
                    console.warn('Mic permission error:', err);
                    alert('Vui lòng cho phép quyền truy cập Microphone trong trình duyệt để sử dụng tính năng nói!');
                    return;
                }
            }

            try {
                DashboardSiri.speechRec.start();
            } catch(e) {
                console.warn('Cannot start speech rec:', e);
                DashboardSiri.stopListening();
            }
        }
    },

    stopListening: () => {
        DashboardSiri.isListening = false;
        const orb = document.getElementById('dash-siri-orb');
        const mic = document.getElementById('dash-siri-mic');
        if (orb) orb.classList.remove('listening');
        if (mic) {
            mic.style.background = '';
            mic.style.borderColor = '';
            mic.style.boxShadow = '';
        }
    },

    sendQuestion: async (overrideText) => {
        const input = document.getElementById('dash-siri-input');
        const text = (overrideText || (input ? input.value : '')).trim();
        if (!text) return;

        if (input) input.value = '';
        const bubble = document.getElementById('dash-siri-text');
        const orb = document.getElementById('dash-siri-orb');
        if (orb) orb.classList.add('thinking');

        if (bubble) {
            bubble.innerHTML = `<span style="color:var(--clr-text-muted); font-size:12px;">Bạn: "${text}"</span><br><strong>Eduvia AI:</strong> <span style="color:var(--clr-cyan);">Đang suy nghĩ và phân tích dữ liệu... ✨</span>`;
        }

        // Đồng bộ câu hỏi vào lịch sử đối thoại dùng chung của Gia Sư AI
        if (typeof AITutor !== 'undefined') {
            AITutor.syncMessageToBox('user', text);
            AITutor.history.push({ role: 'user', content: text });
            try {
                sessionStorage.setItem('eduvia_ai_chat_history', JSON.stringify(AITutor.history.slice(-30)));
            } catch(e) {}
        }

        try {
            const activeMode = (typeof AITutor !== 'undefined' && AITutor.activeMode) ? AITutor.activeMode : 'general';
            const historyToSend = (typeof AITutor !== 'undefined') ? AITutor.history.slice(0, -1) : [];

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    mode: activeMode,
                    history: historyToSend
                })
            });
            const data = await res.json();
            if (orb) orb.classList.remove('thinking');

            const reply = data.reply || 'Eduvia AI luôn sẵn sàng đồng hành cùng bạn trên con đường học tập!';
            let formatted = reply.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            // Đồng bộ phản hồi vào lịch sử dùng chung
            if (typeof AITutor !== 'undefined') {
                AITutor.history.push({ role: 'model', content: reply });
                try {
                    sessionStorage.setItem('eduvia_ai_chat_history', JSON.stringify(AITutor.history.slice(-30)));
                } catch(e) {}
                AITutor.syncMessageToBox('ai', reply);
            }

            if (bubble) {
                bubble.innerHTML = `
                    <div style="font-size:12px; color:var(--clr-text-muted); margin-bottom:4px;"><strong>Bạn:</strong> "${text}"</div>
                    <div style="font-size:13px; line-height:1.6; max-height:220px; overflow-y:auto; padding-right:4px;"><strong>Eduvia AI:</strong><br>${formatted}</div>
                    <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
                        <button onclick="switchView('aichat')" style="background:rgba(59,130,246,0.18); border:1px solid rgba(59,130,246,0.4); color:#93c5fd; border-radius:6px; font-size:11px; padding:3px 10px; cursor:pointer; font-weight:600;">
                            💬 Mở toàn màn hình Gia Sư AI & hỏi tiếp
                        </button>
                    </div>
                `;
            }

            // Đọc câu trả lời bằng giọng nói tự nhiên, không đọc emoji và không bị ngắt quãng giữa chừng
            if (window.speechSynthesis && typeof AITutor !== 'undefined' && AITutor.ttsEnabled) {
                speakCleanText(reply, false);
            }
        } catch(e) {
            if (orb) orb.classList.remove('thinking');
            try {
                const activeMode = (typeof AITutor !== 'undefined' && AITutor.activeMode) ? AITutor.activeMode : 'general';
                const historyToSend = (typeof AITutor !== 'undefined') ? AITutor.history.slice(0, -1) : [];
                const clientReply = await clientGenerateSmartContextualReply(text, activeMode, historyToSend);
                let formatted = clientReply.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

                // Đồng bộ phản hồi vào lịch sử dùng chung
                if (typeof AITutor !== 'undefined') {
                    AITutor.history.push({ role: 'model', content: clientReply });
                    try {
                        sessionStorage.setItem('eduvia_ai_chat_history', JSON.stringify(AITutor.history.slice(-30)));
                    } catch(err) {}
                    AITutor.syncMessageToBox('ai', clientReply);
                }

                if (bubble) {
                    bubble.innerHTML = `
                        <div style="font-size:12px; color:var(--clr-text-muted); margin-bottom:4px;"><strong>Bạn:</strong> "${text}"</div>
                        <div style="font-size:13px; line-height:1.6; max-height:220px; overflow-y:auto; padding-right:4px;"><strong>Eduvia AI:</strong><br>${formatted}</div>
                        <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
                            <button onclick="switchView('aichat')" style="background:rgba(59,130,246,0.18); border:1px solid rgba(59,130,246,0.4); color:#93c5fd; border-radius:6px; font-size:11px; padding:3px 10px; cursor:pointer; font-weight:600;">
                                💬 Mở toàn màn hình Gia Sư AI & hỏi tiếp
                            </button>
                        </div>
                    `;
                }

                if (window.speechSynthesis && typeof AITutor !== 'undefined' && AITutor.ttsEnabled) {
                    speakCleanText(clientReply, false);
                }
            } catch(err2) {
                if (bubble) {
                    bubble.innerHTML = `<span style="color:#ef4444;">Không thể kết nối đến máy chủ AI lúc này. Bạn thử lại nhé!</span>`;
                }
            }
        }
    }
};

window.DashboardSiri = DashboardSiri;
window.sendDashAiMessage = () => DashboardSiri.sendQuestion();
window.startDashVoice = () => DashboardSiri.toggleVoiceListening();

// ----------------------------------------------------
// 3. EISENHOWER MATRIX & PLANNER MANAGER
// ----------------------------------------------------
const EisenhowerManager = {
    currentPlannerView: 'list', // 'list' | 'matrix'
    suggestedSchedule: [],

    init: () => {
        EisenhowerManager.renderMatrix();
    },

    switchPlannerView: (mode) => {
        EisenhowerManager.currentPlannerView = mode;
        document.getElementById('btn-toggle-list').classList.toggle('active', mode === 'list');
        document.getElementById('btn-toggle-matrix').classList.toggle('active', mode === 'matrix');

        document.getElementById('planner-mode-list-view').style.display = mode === 'list' ? 'block' : 'none';
        document.getElementById('planner-mode-matrix-view').style.display = mode === 'matrix' ? 'block' : 'none';

        if (mode === 'matrix') {
            EisenhowerManager.renderMatrix();
        } else {
            Planner.renderTasks();
        }
    },

    renderMatrix: () => {
        const tasks = Storage.load('tasks') || [];
        const quadrants = { 'Q1': [], 'Q2': [], 'Q3': [], 'Q4': [] };

        tasks.forEach(t => {
            const q = t.quadrant || 'Q2';
            if (quadrants[q]) quadrants[q].push(t);
            else quadrants['Q2'].push(t);
        });

        ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
            const container = document.getElementById(`eisen-tasks-${q.toLowerCase()}`);
            if (!container) return;
            container.innerHTML = '';

            const list = quadrants[q].filter(t => t.status !== 'done');
            if (list.length === 0) {
                container.innerHTML = `<p style="font-size:12px; color:var(--clr-text-muted); text-align:center; padding: 20px;">Chưa có nhiệm vụ trong góc này.</p>`;
                return;
            }

            list.forEach(task => {
                const card = document.createElement('div');
                card.className = 'eisen-task-card';
                card.innerHTML = `
                    <div class="eisen-task-left">
                        <span class="task-circle" onclick="Planner.finishTask(${task.id}); setTimeout(EisenhowerManager.renderMatrix, 400)">✓</span>
                        <div>
                            <div style="font-size: 14px; font-weight: 600; color: #fff;">${task.name}</div>
                            <div style="font-size: 11px; color: var(--clr-text-muted); margin-top: 2px;">
                                ${task.deadline ? '📅 ' + task.deadline : ''} 
                                ${task.time ? '⏰ ' + task.time : ''}
                            </div>
                        </div>
                    </div>
                    <select class="input-glass" style="font-size: 11px; padding: 3px 6px; border-radius: var(--radius-sm);" onchange="EisenhowerManager.moveTask(${task.id}, this.value)">
                        <option value="Q1" ${q === 'Q1' ? 'selected' : ''}>Chuyển Q1</option>
                        <option value="Q2" ${q === 'Q2' ? 'selected' : ''}>Chuyển Q2</option>
                        <option value="Q3" ${q === 'Q3' ? 'selected' : ''}>Chuyển Q3</option>
                        <option value="Q4" ${q === 'Q4' ? 'selected' : ''}>Chuyển Q4</option>
                    </select>
                `;
                container.appendChild(card);
            });
        });
    },

    moveTask: (taskId, newQuadrant) => {
        const tasks = Storage.load('tasks') || [];
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.quadrant = newQuadrant;
            Storage.save('tasks', tasks);
            EisenhowerManager.renderMatrix();
            AuthManager.syncToCloud();
        }
    },

    openAddTaskModal: (defaultQuadrant = 'Q2') => {
        const modal = document.getElementById('modal-add-eisen-task');
        if (!modal) return;
        const nameInput = document.getElementById('eisen-task-name');
        const quadSelect = document.getElementById('eisen-task-quadrant');
        const dateInput = document.getElementById('eisen-task-date');
        const timeInput = document.getElementById('eisen-task-time');

        if (nameInput) nameInput.value = '';
        if (quadSelect) quadSelect.value = defaultQuadrant || 'Q2';
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
        if (timeInput) timeInput.value = '';

        modal.style.display = 'flex';
        if (nameInput) setTimeout(() => nameInput.focus(), 100);
    },

    addTaskToQuadrant: (q) => {
        EisenhowerManager.openAddTaskModal(q);
    },

    saveTaskFromModal: () => {
        const nameInput = document.getElementById('eisen-task-name');
        const quadSelect = document.getElementById('eisen-task-quadrant');
        const dateInput = document.getElementById('eisen-task-date');
        const timeInput = document.getElementById('eisen-task-time');

        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) {
            alert('Vui lòng nhập tên nhiệm vụ hoặc bài tập!');
            if (nameInput) nameInput.focus();
            return;
        }

        const quadrant = quadSelect ? quadSelect.value : 'Q2';
        const date = dateInput ? dateInput.value : '';
        const time = timeInput ? timeInput.value : '';

        const tasks = Storage.load('tasks') || [];
        const newTask = {
            id: Date.now(),
            name,
            quadrant,
            deadline: date,
            date: date,
            time: time,
            status: 'pending'
        };

        tasks.push(newTask);
        Storage.save('tasks', tasks);

        closeModals();
        EisenhowerManager.renderMatrix();
        if (typeof Planner !== 'undefined' && Planner.renderTasks) {
            Planner.renderTasks();
        }
        if (typeof updateDashboardStats === 'function') {
            updateDashboardStats();
        }
        AuthManager.syncToCloud();
    },

    openAiScheduleModal: async () => {
        const tasks = Storage.load('tasks') || [];
        const pendingTasks = tasks.filter(t => t.status !== 'done');
        const modal = document.getElementById('modal-ai-schedule');
        const box = document.getElementById('ai-schedule-list-box');
        if (!modal || !box) return;

        modal.style.display = 'flex';

        if (pendingTasks.length === 0) {
            box.innerHTML = `
                <div style="text-align:center; padding:30px 20px; color:var(--clr-text-muted);">
                    <div style="font-size:36px; margin-bottom:12px;">📋</div>
                    <h4 style="color:#fff; font-size:16px; margin-bottom:8px;">Chưa có nhiệm vụ trong ma trận!</h4>
                    <p style="font-size:13px; max-width:400px; margin:0 auto 16px auto;">
                        Eduvia AI không tạo lịch ảo ngẫu nhiên. Vui lòng nhấn nút <strong>"+ Thêm việc"</strong> vào các góc phần tư Eisenhower trước để AI sắp xếp tối ưu theo độ ưu tiên cho bạn nhé!
                    </p>
                    <button class="btn btn-primary" onclick="closeModals(); openTaskModalStep1();" style="padding:8px 20px; font-size:13px;">
                        + Thêm Nhiệm Vụ Đầu Tiên
                    </button>
                </div>
            `;
            return;
        }

        box.innerHTML = `<p style="text-align:center; color:var(--clr-text-muted); padding:30px;">🤖 Eduvia AI đang phân tích các công việc trong ma trận Eisenhower để sắp xếp lịch trình tối ưu theo thời gian thực...</p>`;

        try {
            const now = new Date();
            const clientHour = now.getHours();
            const clientMinute = now.getMinutes();

            const res = await fetch('/api/ai/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tasks: pendingTasks,
                    clientHour,
                    clientMinute
                })
            });
            const data = await res.json();
            if (data.success && data.schedule && data.schedule.length > 0) {
                EisenhowerManager.suggestedSchedule = data.schedule;
                box.innerHTML = '';
                if (data.message) {
                    const msgDiv = document.createElement('div');
                    msgDiv.style.background = 'rgba(56, 189, 248, 0.15)';
                    msgDiv.style.border = '1px solid var(--clr-cyan)';
                    msgDiv.style.borderRadius = 'var(--radius-md)';
                    msgDiv.style.padding = '10px 14px';
                    msgDiv.style.marginBottom = '12px';
                    msgDiv.style.fontSize = '13px';
                    msgDiv.style.color = '#fff';
                    msgDiv.innerHTML = `💡 <strong>Lịch trình đề xuất:</strong> ${data.message}`;
                    box.appendChild(msgDiv);
                }
                data.schedule.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'glass';
                    div.style.padding = '12px 16px';
                    div.style.borderRadius = 'var(--radius-md)';
                    div.style.borderLeft = item.quadrant === 'Q1' ? '4px solid #ef4444' : '4px solid var(--clr-cyan)';
                    div.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:700; color:var(--clr-gold); font-size:13px;">⏰ ${item.time}</span>
                            <span class="quadrant-badge ${item.quadrant === 'Q1' ? 'badge-q1' : 'badge-q2'}">${item.quadrant || 'Tập trung'}</span>
                        </div>
                        <div style="font-weight:600; font-size:14px; color:#fff;">${item.title}</div>
                        <div style="font-size:12px; color:var(--clr-text-muted); margin-top:2px;">${item.desc || ''}</div>
                    `;
                    box.appendChild(div);
                });
            } else {
                box.innerHTML = `
                    <div style="text-align:center; padding:24px; color:var(--clr-text-muted);">
                        <p style="color:#fff; font-weight:600;">${data.message || 'Không có đề xuất lịch trình.'}</p>
                    </div>
                `;
            }
        } catch(e) {
            box.innerHTML = `<p style="text-align:center; color:#ef4444; padding:20px;">Lỗi khi tải đề xuất từ AI.</p>`;
        }
    },

    applyAiSchedule: () => {
        if (!EisenhowerManager.suggestedSchedule || EisenhowerManager.suggestedSchedule.length === 0) {
            closeModals();
            return;
        }

        const tasks = Storage.load('tasks') || [];
        const todayStr = new Date().toISOString().split('T')[0];

        EisenhowerManager.suggestedSchedule.forEach((item, idx) => {
            tasks.push({
                id: Date.now() + idx,
                name: item.title,
                deadline: todayStr,
                date: todayStr,
                time: item.time,
                quadrant: item.quadrant || 'Q2',
                status: 'pending'
            });
        });

        Storage.save('tasks', tasks);
        closeModals();
        alert('✨ Đã áp dụng các khối lịch trình của AI vào Planner hôm nay. Bạn có thể tự do chỉnh sửa bất kỳ lúc nào!');
        Planner.renderTasks();
        EisenhowerManager.renderMatrix();
        AuthManager.syncToCloud();
    }
};

// ----------------------------------------------------
// 4. TIMER AI ESTIMATOR
// ----------------------------------------------------
const TimerAIEstimator = {
    selectedTask: null,
    recommendedMins: 25,

    init: () => {
        TimerAIEstimator.populateTaskSelect();
    },

    populateTaskSelect: () => {
        const select = document.getElementById('timer-task-select');
        if (!select) return;
        const tasks = Storage.load('tasks') || [];
        const pending = tasks.filter(t => t.status !== 'done');

        select.innerHTML = '<option value="">-- Chọn nhiệm vụ cần tập trung hôm nay --</option>';
        pending.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `[${t.quadrant || 'Q2'}] ${t.name}`;
            select.appendChild(opt);
        });
    },

    onTaskSelected: () => {
        const select = document.getElementById('timer-task-select');
        const tasks = Storage.load('tasks') || [];
        const task = tasks.find(t => t.id == select.value);
        TimerAIEstimator.selectedTask = task;
        if (task) {
            TimerAIEstimator.calculateRecommendedTime();
        }
    },

    calculateRecommendedTime: async () => {
        const task = TimerAIEstimator.selectedTask;
        const box = document.getElementById('timer-ai-recommendation-box');
        if (!box) return;

        box.style.display = 'block';
        document.getElementById('ai-rec-title').textContent = '🤖 Đang tính toán...';
        document.getElementById('ai-rec-reason').textContent = 'AI đang xem xét mức độ ưu tiên theo ma trận Eisenhower...';

        try {
            const res = await fetch('/api/ai/timer-estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskName: task ? task.name : 'Nhiệm vụ ôn tập',
                    quadrant: task ? task.quadrant : 'Q2',
                    tag: task ? task.tag : ''
                })
            });
            const data = await res.json();
            if (data.success) {
                TimerAIEstimator.recommendedMins = data.recommendedMinutes;
                document.getElementById('ai-rec-title').textContent = `🎯 Đề xuất: ${data.recommendedMinutes} phút tập trung (${data.pomodoroSessions} phiên)`;
                document.getElementById('ai-rec-reason').textContent = data.reason;
            }
        } catch(e) {
            document.getElementById('ai-rec-title').textContent = '🎯 Đề xuất: 25 phút Pomodoro tiêu chuẩn';
            document.getElementById('ai-rec-reason').textContent = 'Khung thời gian cân bằng cho sự tập trung.';
        }
    },

    applyRecommendation: () => {
        const mins = TimerAIEstimator.recommendedMins || 25;
        const customInput = document.getElementById('pomodoro-custom-time');
        if (customInput) customInput.value = mins;
        switchTimerMode('timer');
        resetTimerLogic();
        alert(`⏱️ Đã đặt thời gian tập trung ${mins} phút theo gợi ý của AI! Nhấn "Bắt đầu" để khởi động.`);
    }
};

// ----------------------------------------------------
// 5. FLASHCARDS AI MASS GENERATOR (1000 WORDS ROADMAP)
// ----------------------------------------------------
const FlashcardAIManager = {
    generatedCards: [],
    currentTopic: '',

    openAiGeneratorModal: () => {
        FlashcardAIManager.generatedCards = [];
        const modal = document.getElementById('modal-ai-flashcards');
        if (modal) modal.style.display = 'flex';
        const preview = document.getElementById('ai-cards-preview-container');
        if (preview) preview.style.display = 'none';
    },

    setPreset: (topic, count, isMass = false) => {
        const input = document.getElementById('ai-flashcard-topic');
        if (input) input.value = topic;
        FlashcardAIManager.generateCards(isMass);
    },

    generateCards: async (isMass = false) => {
        const input = document.getElementById('ai-flashcard-topic');
        const topic = input ? input.value.trim() : '';
        if (!topic) { alert('Vui lòng nhập chủ đề hoặc từ khóa!'); return; }

        FlashcardAIManager.currentTopic = topic;
        const btn = document.getElementById('btn-generate-cards');
        if (btn) btn.textContent = '⏳ AI đang soạn thẻ... Vui lòng đợi trong giây lát';

        try {
            const res = await fetch('/api/ai/generate-flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, count: isMass ? 25 : 15, isMassGeneration: isMass })
            });
            const data = await res.json();
            if (btn) btn.textContent = '🚀 Bắt Đầu Sinh Thẻ Bằng AI';

            if (data.success && data.cards) {
                FlashcardAIManager.generatedCards = data.cards;
                FlashcardAIManager.renderPreviewCards();
            } else {
                alert('Không thể tạo flashcard lúc này.');
            }
        } catch(e) {
            if (btn) btn.textContent = '🚀 Bắt Đầu Sinh Thẻ Bằng AI';
            alert('Lỗi kết nối máy chủ khi tạo flashcard.');
        }
    },

    generateMoreCards: async () => {
        try {
            const res = await fetch('/api/ai/generate-flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: FlashcardAIManager.currentTopic, count: 15 })
            });
            const data = await res.json();
            if (data.success && data.cards) {
                FlashcardAIManager.generatedCards = FlashcardAIManager.generatedCards.concat(data.cards);
                FlashcardAIManager.renderPreviewCards();
            }
        } catch(e){}
    },

    renderPreviewCards: () => {
        const preview = document.getElementById('ai-cards-preview-container');
        const list = document.getElementById('ai-cards-preview-list');
        const countEl = document.getElementById('ai-cards-preview-count');
        if (!preview || !list) return;

        preview.style.display = 'block';
        list.innerHTML = '';
        if (countEl) countEl.textContent = `Đã tạo ${FlashcardAIManager.generatedCards.length} thẻ ghi nhớ`;

        FlashcardAIManager.generatedCards.forEach((c, idx) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.innerHTML = `
                <input type="text" class="input-glass" style="flex:1; font-size:12px;" value="${c.def}" onchange="FlashcardAIManager.generatedCards[${idx}].def = this.value">
                <input type="text" class="input-glass" style="flex:1; font-size:12px;" value="${c.content}" onchange="FlashcardAIManager.generatedCards[${idx}].content = this.value">
                <button type="button" class="btn" style="background:transparent; color:#ef4444; padding:4px 8px;" onclick="this.parentElement.remove(); FlashcardAIManager.generatedCards.splice(${idx}, 1)">✕</button>
            `;
            list.appendChild(row);
        });
    },

    saveGeneratedDeck: () => {
        if (!FlashcardAIManager.generatedCards || FlashcardAIManager.generatedCards.length === 0) {
            alert('Chưa có thẻ nào được tạo!');
            return;
        }

        const decks = Storage.load('decks') || [];
        const newDeck = {
            id: Date.now(),
            name: FlashcardAIManager.currentTopic || 'Bộ thẻ AI ' + new Date().toLocaleDateString('vi-VN'),
            cards: FlashcardAIManager.generatedCards
        };

        decks.push(newDeck);
        Storage.save('decks', decks);
        closeModals();
        alert(`🎉 Đã lưu bộ thẻ "${newDeck.name}" với ${newDeck.cards.length} thẻ ghi nhớ vào tài khoản của bạn!`);
        searchDecks();
        updateDashboardStats();
        AuthManager.syncToCloud();
    }
};

// ----------------------------------------------------
// 6. STUDY MATCH MANAGER (LIVE ROOMS, BATTLE, FORUM)
// ----------------------------------------------------
const StudyMatchManager = {
    activeRoom: null,
    roomTimerInterval: null,
    roomSyncInterval: null,
    roomElapsedSeconds: 0,
    isRoomMicMuted: true,
    audioStream: null,
    audioContext: null,
    analyser: null,
    voiceRecorder: null,
    isSpeaking: false,
    lastSyncTimestamp: 0,
    knownMessageIds: new Set(),
    knownVoiceIds: new Set(),

    getCurrentUser: () => {
        let savedId = sessionStorage.getItem('eduvia_studymatch_uid');
        if (!savedId) {
            savedId = 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            sessionStorage.setItem('eduvia_studymatch_uid', savedId);
        }
        if (AuthManager.currentUser && !AuthManager.isGuest) {
            return {
                id: AuthManager.currentUser.id || AuthManager.currentUser.username || savedId,
                username: AuthManager.currentUser.username,
                name: AuthManager.currentUser.name || AuthManager.currentUser.username,
                avatar: AuthManager.currentUser.avatar || '🪐'
            };
        }
        return {
            id: savedId,
            username: savedId,
            name: 'Bạn Học Vũ Trụ',
            avatar: '🚀'
        };
    },

    init: () => {
        StudyMatchManager.loadRooms();
        const handleExit = () => {
            if (StudyMatchManager.activeRoom) {
                const me = StudyMatchManager.getCurrentUser();
                const payload = JSON.stringify({
                    roomId: StudyMatchManager.activeRoom.id,
                    userId: me.id,
                    username: me.username,
                    name: me.name
                });
                if (navigator.sendBeacon) {
                    navigator.sendBeacon('/api/match/leave-room', new Blob([payload], { type: 'application/json' }));
                }
            }
        };
        window.addEventListener('beforeunload', handleExit);
        window.addEventListener('pagehide', handleExit);
    },

    switchSubTab: (tab) => {
        ['rooms', 'battle', 'forum'].forEach(t => {
            const btn = document.getElementById(`tab-match-${t}`);
            const content = document.getElementById(`subtab-content-${t}`);
            if (btn) btn.classList.toggle('active', t === tab);
            if (content) content.style.display = t === tab ? 'block' : 'none';
        });

        if (tab === 'rooms') StudyMatchManager.loadRooms();
        if (tab === 'battle') StudyBattleManager.init();
        if (tab === 'forum') StudyForumManager.loadPosts();
    },

    loadRooms: async () => {
        const container = document.getElementById('live-rooms-container');
        if (!container) return;
        try {
            const res = await fetch('/api/match/rooms');
            const data = await res.json();
            if (data.success && data.rooms) {
                container.innerHTML = '';
                if (data.rooms.length === 0) {
                    container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--clr-text-muted); padding:30px;">Hiện chưa có phòng nào. Nhấn "Ghép Phòng Học Ngay" để mở phòng đầu tiên!</p>`;
                    return;
                }

                data.rooms.forEach(room => {
                    const card = document.createElement('div');
                    card.className = 'study-room-card glass';

                    const pCount = room.participants ? room.participants.length : 0;
                    const maxCount = room.maxParticipants || 4;

                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="quadrant-badge badge-q2">${room.subject}</span>
                            <span style="font-size:12px; font-weight:700; color:${pCount < maxCount ? 'var(--clr-success)' : '#ef4444'};">
                                🟢 ${pCount}/${maxCount} bạn
                            </span>
                        </div>
                        <h4 style="font-size:16px; font-weight:700; color:#fff; margin:0;">${room.title}</h4>
                        <p style="font-size:13px; color:var(--clr-text-muted); margin:0; line-height:1.4;">🎯 ${room.goal || 'Cùng ôn thi và làm bài tập'}</p>
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--clr-glass-border); padding-top:12px; margin-top:4px;">
                            <div style="display:flex; gap:6px;">
                                ${(room.participants || []).map(p => `<span style="font-size:20px;" title="${p.name} (${p.studyMinutes}p)">${p.avatar}</span>`).join('')}
                            </div>
                            <button class="btn btn-primary" onclick="StudyMatchManager.joinRoom('${room.id}')" style="font-size:13px; padding:6px 16px;">
                                Tham Gia 🚀
                            </button>
                        </div>
                    `;
                    container.appendChild(card);
                });
            }
        } catch(e) {
            console.error('Failed to load rooms:', e);
        }
    },

    openFindRoomModal: () => {
        document.getElementById('modal-find-room').style.display = 'flex';
    },

    executeMatchmaking: async () => {
        const subject = document.getElementById('find-room-subject').value;
        const topic = document.getElementById('find-room-topic').value;
        const duration = document.getElementById('find-room-duration').value;
        const count = document.getElementById('find-room-count').value;
        const goal = document.getElementById('find-room-goal').value;

        const user = StudyMatchManager.getCurrentUser();

        try {
            const res = await fetch('/api/match/find-or-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, topic, targetMinutes: duration, count, goal, user })
            });
            const data = await res.json();
            closeModals();
            if (data.success && data.room) {
                alert(data.message);
                StudyMatchManager.enterRoomView(data.room);
            }
        } catch(e) {
            alert('Lỗi khi ghép phòng.');
        }
    },

    joinRoom: async (roomId) => {
        const user = StudyMatchManager.getCurrentUser();

        try {
            const res = await fetch('/api/match/join-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, user })
            });
            const data = await res.json();
            if (data.success && data.room) {
                StudyMatchManager.enterRoomView(data.room);
            } else {
                alert(data.message || 'Không thể tham gia phòng này.');
            }
        } catch(e) {
            alert('Lỗi kết nối khi vào phòng.');
        }
    },

    enterRoomView: (room) => {
        StudyMatchManager.activeRoom = room;
        StudyMatchManager.knownMessageIds = new Set();
        StudyMatchManager.knownVoiceIds = new Set();
        StudyMatchManager.lastSyncTimestamp = Date.now() - 3000;

        const liveView = document.getElementById('live-active-room-view');
        if (!liveView) return;

        liveView.style.display = 'block';
        document.getElementById('active-room-title').textContent = room.title;
        document.getElementById('active-room-subject').textContent = room.subject;
        document.getElementById('active-room-goal').textContent = '🎯 ' + (room.goal || 'Cùng học tập');
        document.getElementById('room-notes-area').value = room.notes || '';

        // Reset nút mic về trạng thái tắt ban đầu
        StudyMatchManager.isRoomMicMuted = true;
        StudyMatchManager.isSpeaking = false;
        const btnMic = document.getElementById('btn-room-mic');
        if (btnMic) {
            btnMic.innerHTML = '🎙️ Bật Micro';
            btnMic.style.background = '';
            btnMic.style.borderColor = '';
            btnMic.style.color = '';
        }

        // Xóa khung chat cũ và hiển thị tin nhắn chào mừng
        const stream = document.getElementById('room-chat-stream');
        if (stream) {
            stream.innerHTML = '<div style="color:var(--clr-text-muted); font-size:11px; margin-bottom:4px;"><em>Hệ thống: Bạn đã vào phòng học. Hãy bật mic hoặc gửi tin nhắn trao đổi bài tập nhé!</em></div>';
            if (Array.isArray(room.messages)) {
                room.messages.forEach(m => {
                    StudyMatchManager.appendChatMessage(m);
                    StudyMatchManager.knownMessageIds.add(m.id);
                });
            }
        }

        StudyMatchManager.renderRoomSlots();

        // Khởi động đồng hồ thời gian phòng
        clearInterval(StudyMatchManager.roomTimerInterval);
        StudyMatchManager.roomElapsedSeconds = 0;
        StudyMatchManager.roomTimerInterval = setInterval(() => {
            StudyMatchManager.roomElapsedSeconds++;
            const m = Math.floor(StudyMatchManager.roomElapsedSeconds / 60).toString().padStart(2, '0');
            const s = (StudyMatchManager.roomElapsedSeconds % 60).toString().padStart(2, '0');
            const timerEl = document.getElementById('active-room-timer');
            if (timerEl) timerEl.textContent = `${m}:${s}`;
        }, 1000);

        // Khởi động vòng lặp đồng bộ thời gian thực (Heartbeat, Tin nhắn, Trạng thái giọng nói)
        clearInterval(StudyMatchManager.roomSyncInterval);
        StudyMatchManager.roomSyncInterval = setInterval(StudyMatchManager.syncActiveRoom, 1800);

        // Cuộn lên xem phòng
        liveView.scrollIntoView({ behavior: 'smooth' });
    },

    syncActiveRoom: async () => {
        if (!StudyMatchManager.activeRoom) {
            clearInterval(StudyMatchManager.roomSyncInterval);
            return;
        }

        const me = StudyMatchManager.getCurrentUser();
        const roomId = StudyMatchManager.activeRoom.id;
        const url = `/api/match/rooms/${roomId}/sync?userId=${encodeURIComponent(me.id)}&isMuted=${StudyMatchManager.isRoomMicMuted}&isSpeaking=${StudyMatchManager.isSpeaking}&since=${StudyMatchManager.lastSyncTimestamp}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (data.closed) {
                clearInterval(StudyMatchManager.roomSyncInterval);
                clearInterval(StudyMatchManager.roomTimerInterval);
                StudyMatchManager.stopMic();
                document.getElementById('live-active-room-view').style.display = 'none';
                StudyMatchManager.activeRoom = null;
                alert('Phòng học đã được đóng vì không còn thành viên nào.');
                StudyMatchManager.loadRooms();
                return;
            }

            if (data.success && data.room) {
                StudyMatchManager.activeRoom.participants = data.room.participants || [];
                StudyMatchManager.renderRoomSlots();

                // Nhận tin nhắn mới từ các bạn học khác
                if (Array.isArray(data.messages)) {
                    data.messages.forEach(msg => {
                        if (!StudyMatchManager.knownMessageIds.has(msg.id)) {
                            StudyMatchManager.knownMessageIds.add(msg.id);
                            StudyMatchManager.appendChatMessage(msg);
                        }
                    });
                }

                // Nhận âm thanh thoại (Voice Notes) từ các bạn học khác và tự động phát
                if (Array.isArray(data.voiceNotes)) {
                    data.voiceNotes.forEach(voice => {
                        if (!StudyMatchManager.knownVoiceIds.has(voice.id)) {
                            StudyMatchManager.knownVoiceIds.add(voice.id);
                            StudyMatchManager.playIncomingVoice(voice);
                        }
                    });
                }

                if (data.serverTime) {
                    StudyMatchManager.lastSyncTimestamp = data.serverTime;
                }
            }
        } catch(e) {
            // Lỗi mạng tạm thời, tiếp tục thử lại ở chu kỳ kế
        }
    },

    playIncomingVoice: (voice) => {
        try {
            const snd = new Audio(voice.audioBase64);
            snd.volume = 1.0;
            snd.play().catch(e => console.log('Autoplay audio note blocked:', e));

            // Hiển thị bong bóng âm thanh trong khung chat
            const stream = document.getElementById('room-chat-stream');
            if (stream) {
                const bubble = document.createElement('div');
                bubble.style.fontSize = '12px';
                bubble.style.padding = '3px 8px';
                bubble.style.borderRadius = '6px';
                bubble.style.background = 'rgba(56, 189, 248, 0.15)';
                bubble.style.border = '1px solid rgba(56, 189, 248, 0.4)';
                bubble.style.color = '#bae6fd';
                bubble.style.marginBottom = '4px';
                bubble.innerHTML = `🎙️ <strong>${voice.sender?.name || 'Bạn học'}:</strong> <em>[Đang phát đoạn thoại mic] 🔊</em>`;
                stream.appendChild(bubble);
                stream.scrollTop = stream.scrollHeight;
            }
        } catch(e){}
    },

    renderRoomSlots: () => {
        const container = document.getElementById('active-room-slots');
        if (!container || !StudyMatchManager.activeRoom) return;
        container.innerHTML = '';

        const participants = StudyMatchManager.activeRoom.participants || [];
        const longestName = StudyMatchManager.activeRoom.longestStudent;
        const me = StudyMatchManager.getCurrentUser();

        for (let i = 0; i < 4; i++) {
            const p = participants[i];
            const slot = document.createElement('div');
            const isMe = p && (p.id === me.id || p.username === me.username);
            const isSpeaking = p && (isMe ? StudyMatchManager.isSpeaking : p.speaking);
            slot.className = `participant-slot-card glass ${isSpeaking ? 'speaking' : ''}`;
            if (p) slot.setAttribute('data-user-id', p.id);

            if (p) {
                const isLongest = (p.username === longestName || p.name === longestName);
                const micIcon = p.isMuted ? '🔇' : (isSpeaking ? '🎙️ Đang nói...' : '🎙️ Mic Bật');
                const micColor = p.isMuted ? '#f87171' : '#4ade80';

                slot.innerHTML = `
                    <div class="participant-slot-avatar">
                        ${p.avatar}
                        ${isLongest ? '<span class="longest-badge">👑 Học lâu nhất</span>' : ''}
                    </div>
                    <div style="font-weight:700; color:#fff; font-size:14px; text-align:center;">
                        ${p.name} ${isMe ? '<span style="color:var(--clr-lavender); font-size:11px;">(Bạn)</span>' : ''}
                    </div>
                    <div style="display:flex; justify-content:space-between; width:100%; font-size:11px; padding:0 8px; margin-top:2px;">
                        <span style="color:var(--clr-cyan);">⏱️ ${p.studyMinutes || 1}p</span>
                        <span style="color:${micColor}; font-weight:600;">${micIcon}</span>
                    </div>
                    <div class="audio-wave-wrap" style="opacity:${isSpeaking ? '1' : '0.2'};">
                        <span class="audio-wave-bar"></span>
                        <span class="audio-wave-bar"></span>
                        <span class="audio-wave-bar"></span>
                        <span class="audio-wave-bar"></span>
                    </div>
                `;
            } else {
                slot.innerHTML = `
                    <div class="participant-slot-avatar" style="opacity:0.3; border:1.5px dashed var(--clr-glass-border); background:transparent;">
                        👤
                    </div>
                    <div style="font-size:13px; color:var(--clr-text-muted);">Ghế trống</div>
                    <span style="font-size:11px; color:var(--clr-cyan-soft);">Đang chờ bạn học...</span>
                `;
            }
            container.appendChild(slot);
        }
    },

    toggleRoomMic: async () => {
        const btn = document.getElementById('btn-room-mic');
        if (StudyMatchManager.isRoomMicMuted) {
            // Muốn bật mic
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    alert('Trình duyệt của bạn không hỗ trợ micro trực tiếp.');
                    return;
                }
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                StudyMatchManager.audioStream = stream;
                StudyMatchManager.isRoomMicMuted = false;

                if (btn) {
                    btn.innerHTML = '🎙️ Mic Đang Bật (Nói để phát)';
                    btn.style.background = 'rgba(74, 222, 128, 0.2)';
                    btn.style.borderColor = 'var(--clr-mint)';
                    btn.style.color = '#86efac';
                }

                // AudioContext để phân tích âm lượng giọng nói thực tế
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    StudyMatchManager.audioContext = new AudioCtx();
                    const source = StudyMatchManager.audioContext.createMediaStreamSource(stream);
                    const analyser = StudyMatchManager.audioContext.createAnalyser();
                    analyser.fftSize = 256;
                    source.connect(analyser);
                    StudyMatchManager.analyser = analyser;

                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    const checkVoice = () => {
                        if (StudyMatchManager.isRoomMicMuted || !StudyMatchManager.activeRoom) return;
                        analyser.getByteFrequencyData(dataArray);
                        let sum = 0;
                        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                        const avg = sum / dataArray.length;
                        // Nếu avg > 14 là đang nói
                        const speakingNow = avg > 14;
                        StudyMatchManager.isSpeaking = speakingNow;

                        const me = StudyMatchManager.getCurrentUser();
                        const mySlot = document.querySelector(`.participant-slot-card[data-user-id="${me.id}"]`);
                        if (mySlot) {
                            mySlot.classList.toggle('speaking', speakingNow);
                        }
                        requestAnimationFrame(checkVoice);
                    };
                    requestAnimationFrame(checkVoice);
                } catch(err) {
                    console.warn('AudioContext not available:', err);
                }

                // Ghi âm và truyền các đoạn thoại giọng nói đến phòng học
                try {
                    if (window.MediaRecorder) {
                        const recorder = new MediaRecorder(stream);
                        StudyMatchManager.voiceRecorder = recorder;
                        recorder.ondataavailable = async (e) => {
                            if (e.data && e.data.size > 1500 && StudyMatchManager.activeRoom && !StudyMatchManager.isRoomMicMuted && StudyMatchManager.isSpeaking) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                    const base64 = reader.result;
                                    const me = StudyMatchManager.getCurrentUser();
                                    await fetch(`/api/match/rooms/${StudyMatchManager.activeRoom.id}/voice`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ audioBase64: base64, user: me, duration: 3 })
                                    }).catch(()=>{});
                                };
                                reader.readAsDataURL(e.data);
                            }
                        };
                        recorder.start(3000); // 3s/chunk
                    }
                } catch(e) {
                    console.warn('MediaRecorder not supported:', e);
                }

            } catch(e) {
                console.error('Mic access error:', e);
                alert('Không thể truy cập Micro. Vui lòng cấp quyền micro trên trình duyệt để đàm thoại cùng bạn học!');
            }
        } else {
            // Tắt mic
            StudyMatchManager.stopMic();
            if (btn) {
                btn.innerHTML = '🔇 Đã Tắt Mic';
                btn.style.background = '';
                btn.style.borderColor = '#ef4444';
                btn.style.color = '#fca5a5';
            }
        }
    },

    stopMic: () => {
        StudyMatchManager.isRoomMicMuted = true;
        StudyMatchManager.isSpeaking = false;
        if (StudyMatchManager.voiceRecorder && StudyMatchManager.voiceRecorder.state !== 'inactive') {
            try { StudyMatchManager.voiceRecorder.stop(); } catch(e){}
        }
        if (StudyMatchManager.audioStream) {
            StudyMatchManager.audioStream.getTracks().forEach(t => t.stop());
            StudyMatchManager.audioStream = null;
        }
        if (StudyMatchManager.audioContext) {
            try { StudyMatchManager.audioContext.close(); } catch(e){}
            StudyMatchManager.audioContext = null;
        }
    },

    sendRoomChat: async () => {
        if (!StudyMatchManager.activeRoom) return;
        const input = document.getElementById('room-chat-input');
        const text = input ? input.value.trim() : '';
        if (!text) return;

        const me = StudyMatchManager.getCurrentUser();
        input.value = '';

        try {
            const res = await fetch(`/api/match/rooms/${StudyMatchManager.activeRoom.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, user: me })
            });
            const data = await res.json();
            if (data.success && data.message) {
                StudyMatchManager.appendChatMessage(data.message);
                StudyMatchManager.knownMessageIds.add(data.message.id);
            }
        } catch(e) {
            StudyMatchManager.appendChatMessage({
                id: 'local_' + Date.now(),
                text,
                sender: me,
                timestamp: Date.now()
            });
        }
    },

    appendChatMessage: (msg) => {
        const stream = document.getElementById('room-chat-stream');
        if (!stream) return;
        const me = StudyMatchManager.getCurrentUser();
        const isMe = msg.sender && (msg.sender.id === me.id || msg.sender.username === me.username);
        const div = document.createElement('div');
        div.style.marginBottom = '4px';
        div.style.lineHeight = '1.4';
        
        if (msg.isSystem) {
            div.style.color = 'var(--clr-cyan-soft)';
            div.style.fontStyle = 'italic';
            div.style.fontSize = '11px';
            div.innerHTML = `🔔 ${msg.text}`;
        } else {
            const senderName = isMe ? 'Bạn' : (msg.sender?.name || 'Bạn học');
            const color = isMe ? 'var(--clr-lavender)' : 'var(--clr-gold)';
            div.innerHTML = `<span style="color:${color}; font-weight:700;">${msg.sender?.avatar || '👤'} ${senderName}:</span> <span style="color:#fff;">${msg.text}</span>`;
        }
        stream.appendChild(div);
        stream.scrollTop = stream.scrollHeight;
    },

    saveRoomNotes: async () => {
        if (!StudyMatchManager.activeRoom) return;
        const notes = document.getElementById('room-notes-area').value;
        try {
            await fetch(`/api/match/rooms/${StudyMatchManager.activeRoom.id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            });
        } catch(e){}
    },

    leaveActiveRoom: async () => {
        if (!StudyMatchManager.activeRoom) return;
        if (!confirm('Bạn có chắc muốn rời phòng học?')) return;

        const roomId = StudyMatchManager.activeRoom.id;
        const me = StudyMatchManager.getCurrentUser();

        // Dừng mic & dọn dẹp intervals
        StudyMatchManager.stopMic();
        clearInterval(StudyMatchManager.roomTimerInterval);
        clearInterval(StudyMatchManager.roomSyncInterval);

        try {
            const res = await fetch('/api/match/leave-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: roomId,
                    userId: me.id,
                    username: me.username,
                    name: me.name
                })
            });
            const data = await res.json();

            document.getElementById('live-active-room-view').style.display = 'none';
            StudyMatchManager.activeRoom = null;

            if (data.closed) {
                alert(`✨ ${data.message || 'Bạn là người cuối cùng rời phòng. Phòng học đã được tự động dọn dẹp và xóa thành công!'}\nBạn được cộng +30 XP vì đã hoàn thành phiên học nhóm.`);
                LevelSystem.addXp(30);
            } else {
                alert('Bạn đã rời phòng học. Các bạn học còn lại vẫn tiếp tục học tập!');
                LevelSystem.addXp(15);
            }
            StudyMatchManager.loadRooms();
            AuthManager.syncToCloud();
        } catch(e) {
            document.getElementById('live-active-room-view').style.display = 'none';
            StudyMatchManager.activeRoom = null;
            StudyMatchManager.loadRooms();
        }
    }
};

// ----------------------------------------------------
// 7. STUDY BATTLE MANAGER (10 QUESTIONS)
// ----------------------------------------------------
const StudyBattleManager = {
    questions: [],
    currentIdx: 0,
    playerScore: 0,
    opponentScore: 0,
    timerSeconds: 15,
    timerInterval: null,
    searchInterval: null,
    searchSeconds: 0,
    countdownInterval: null,

    init: () => {
        StudyBattleManager.returnToLobby();
    },

    returnToLobby: () => {
        clearInterval(StudyBattleManager.timerInterval);
        clearInterval(StudyBattleManager.searchInterval);
        clearInterval(StudyBattleManager.countdownInterval);

        const lobby = document.getElementById('battle-lobby-screen');
        const searching = document.getElementById('battle-searching-screen');
        const matched = document.getElementById('battle-matched-screen');
        const arena = document.getElementById('battle-arena-screen');

        if (lobby) lobby.style.display = 'flex';
        if (searching) searching.style.display = 'none';
        if (matched) matched.style.display = 'none';
        if (arena) arena.style.display = 'none';
    },

    startMatchmaking: () => {
        const subjectSelect = document.getElementById('battle-subject-select');
        const subject = subjectSelect ? subjectSelect.value : 'Hóa học';

        const lobby = document.getElementById('battle-lobby-screen');
        const searching = document.getElementById('battle-searching-screen');
        const matched = document.getElementById('battle-matched-screen');
        const arena = document.getElementById('battle-arena-screen');

        if (lobby) lobby.style.display = 'none';
        if (searching) searching.style.display = 'flex';
        if (matched) matched.style.display = 'none';
        if (arena) arena.style.display = 'none';

        StudyBattleManager.searchSeconds = 0;
        const timerEl = document.getElementById('matchmaking-timer-sec');
        if (timerEl) timerEl.textContent = '00:00';

        clearInterval(StudyBattleManager.searchInterval);
        StudyBattleManager.searchInterval = setInterval(() => {
            StudyBattleManager.searchSeconds++;
            const s = StudyBattleManager.searchSeconds.toString().padStart(2, '0');
            if (timerEl) timerEl.textContent = `00:${s}`;
        }, 1000);

        // Chuẩn bị môn và chương trọng tâm Cấp 3
        let chapter = 'Trọng tâm Cấp 3';
        if (subject === 'Hóa học') chapter = 'Este - Lipit 12';
        else if (subject === 'Toán học') chapter = 'Đạo hàm & Khảo sát hàm số 12';
        else if (subject === 'Vật lý') chapter = 'Dao động điều hòa 12';
        else if (subject === 'Tiếng Anh') chapter = 'Ngữ pháp & Từ vựng THPTQG';

        fetch('/api/match/battle/quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, chapter })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.questions) {
                StudyBattleManager.questions = data.questions;
            }
        })
        .catch(err => console.warn('Quiz fetch err:', err));

        // Sau 3.2 giây quét radar tìm bạn cùng thi đấu
        setTimeout(() => {
            clearInterval(StudyBattleManager.searchInterval);
            if (searching.style.display === 'none') return; // Người dùng đã hủy

            searching.style.display = 'none';
            matched.style.display = 'flex';

            const user = AuthManager.currentUser || { name: 'Bạn', avatar: '🚀' };
            const p1Name = document.getElementById('matched-p1-name');
            const p1Av = document.getElementById('matched-p1-avatar');
            if (p1Name) p1Name.textContent = user.name || 'Bạn';
            if (p1Av) p1Av.textContent = user.avatar || '🚀';

            const opponents = [
                { name: 'Minh Anh (12A1 Chu Văn An)', avatar: '🌸' },
                { name: 'Quang Huy (Chuyên Tự Nhiên)', avatar: '⚡' },
                { name: 'Bảo Ngọc (12 Chuyên Hóa)', avatar: '🧪' },
                { name: 'Tuấn Kiệt (THPT Lê Hồng Phong)', avatar: '🪐' },
                { name: 'Khánh Linh (12A3)', avatar: '✨' }
            ];
            const opp = opponents[Math.floor(Math.random() * opponents.length)];
            const p2Name = document.getElementById('matched-p2-name');
            const p2Av = document.getElementById('matched-p2-avatar');
            if (p2Name) p2Name.textContent = opp.name;
            if (p2Av) p2Av.textContent = opp.avatar;

            // Thiết lập thông tin đấu trường
            const bP1Name = document.getElementById('battle-player1-name');
            const bP1Av = document.getElementById('battle-player1-avatar');
            const bP2Name = document.getElementById('battle-player2-name');
            const bP2Av = document.getElementById('battle-player2-avatar');
            if (bP1Name) bP1Name.textContent = user.name || 'Bạn';
            if (bP1Av) bP1Av.textContent = user.avatar || '🚀';
            if (bP2Name) bP2Name.textContent = opp.name;
            if (bP2Av) bP2Av.textContent = opp.avatar;

            // Đếm ngược 3..2..1..
            let count = 3;
            const countText = document.getElementById('match-countdown-text');
            if (countText) countText.textContent = `Trận đấu bắt đầu sau ${count}...`;

            clearInterval(StudyBattleManager.countdownInterval);
            StudyBattleManager.countdownInterval = setInterval(() => {
                count--;
                if (count > 0) {
                    if (countText) countText.textContent = `Trận đấu bắt đầu sau ${count}...`;
                } else {
                    clearInterval(StudyBattleManager.countdownInterval);
                    matched.style.display = 'none';
                    arena.style.display = 'block';

                    StudyBattleManager.currentIdx = 0;
                    StudyBattleManager.playerScore = 0;
                    StudyBattleManager.opponentScore = 0;
                    document.getElementById('battle-player1-score').textContent = '0';
                    document.getElementById('battle-player2-score').textContent = '0';
                    document.getElementById('battle-current-topic').textContent = `${subject} (${chapter})`;

                    StudyBattleManager.showQuestion(0);
                }
            }, 1000);
        }, 3200);
    },

    cancelMatchmaking: () => {
        StudyBattleManager.returnToLobby();
    },

    showQuestion: (idx) => {
        clearInterval(StudyBattleManager.timerInterval);
        document.getElementById('battle-explanation-box').style.display = 'none';

        if (idx >= StudyBattleManager.questions.length) {
            StudyBattleManager.endBattle();
            return;
        }

        StudyBattleManager.currentIdx = idx;
        const q = StudyBattleManager.questions[idx];

        document.getElementById('battle-question-idx').textContent = idx + 1;
        document.getElementById('battle-question-text').textContent = q.q;

        const container = document.getElementById('battle-options-container');
        container.innerHTML = '';

        q.options.forEach((opt, optIdx) => {
            const btn = document.createElement('button');
            btn.className = 'battle-opt-btn';
            btn.textContent = `${String.fromCharCode(65 + optIdx)}. ${opt}`;
            btn.onclick = () => StudyBattleManager.chooseAnswer(optIdx, btn);
            container.appendChild(btn);
        });

        StudyBattleManager.timerSeconds = 15;
        document.getElementById('battle-timer-countdown').textContent = `⏱️ 15s`;

        StudyBattleManager.timerInterval = setInterval(() => {
            StudyBattleManager.timerSeconds--;
            document.getElementById('battle-timer-countdown').textContent = `⏱️ ${StudyBattleManager.timerSeconds}s`;
            if (StudyBattleManager.timerSeconds <= 0) {
                clearInterval(StudyBattleManager.timerInterval);
                StudyBattleManager.chooseAnswer(-1, null);
            }
        }, 1000);
    },

    chooseAnswer: (selectedIdx, selectedBtn) => {
        clearInterval(StudyBattleManager.timerInterval);
        const q = StudyBattleManager.questions[StudyBattleManager.currentIdx];
        const correct = q.correct;

        const allBtns = document.querySelectorAll('.battle-opt-btn');
        allBtns.forEach((b, idx) => {
            b.onclick = null;
            if (idx === correct) b.classList.add('correct');
        });

        const isUserCorrect = (selectedIdx === correct);
        if (selectedBtn && !isUserCorrect) {
            selectedBtn.classList.add('wrong');
        }

        if (isUserCorrect) {
            StudyBattleManager.playerScore += 10;
            document.getElementById('battle-player1-score').textContent = StudyBattleManager.playerScore;
        }

        // Mô phỏng đối thủ (xác suất 70% đúng)
        if (Math.random() < 0.70) {
            StudyBattleManager.opponentScore += 10;
            document.getElementById('battle-player2-score').textContent = StudyBattleManager.opponentScore;
        }

        const expBox = document.getElementById('battle-explanation-box');
        const expText = document.getElementById('battle-explanation-text');
        if (expBox && expText) {
            expBox.style.display = 'block';
            expText.textContent = q.exp || 'Lời giải chi tiết từ Eduvia.';
        }

        setTimeout(() => {
            StudyBattleManager.showQuestion(StudyBattleManager.currentIdx + 1);
        }, 3200);
    },

    endBattle: () => {
        const p1 = StudyBattleManager.playerScore;
        const p2 = StudyBattleManager.opponentScore;
        const won = p1 >= p2;

        if (won) {
            alert(`🏆 CHIẾN THẮNG TUYỆT VỜI!\nBạn đạt ${p1} điểm (Đối thủ: ${p2} điểm).\nBạn nhận được +60 XP và ghi danh vào Bảng Vàng!`);
            LevelSystem.addXp(60);
        } else {
            alert(`👏 NỖ LỰC ĐÁNG KHEN!\nBạn đạt ${p1} điểm (Đối thủ: ${p2} điểm).\nBạn nhận được +20 XP rèn luyện bản lĩnh.`);
            LevelSystem.addXp(20);
        }
        AuthManager.syncToCloud();
        StudyBattleManager.returnToLobby();
    }
};

window.StudyBattleManager = StudyBattleManager;

// ----------------------------------------------------
// 8. STUDY FORUM MANAGER (Q&A & 1-1 PAIRING +50 XP)
// ----------------------------------------------------
const StudyForumManager = {
    posts: [],

    loadPosts: async () => {
        const container = document.getElementById('forum-posts-container');
        if (!container) return;

        try {
            const res = await fetch('/api/match/forum');
            const data = await res.json();
            if (data.success && data.posts) {
                StudyForumManager.posts = data.posts;
                container.innerHTML = '';

                data.posts.forEach(post => {
                    const card = document.createElement('div');
                    card.className = 'forum-post-card glass';

                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span style="font-size:24px;">${post.avatar || '💡'}</span>
                                <div>
                                    <div style="font-weight:700; color:#fff;">${post.name || post.author}</div>
                                    <span style="font-size:12px; color:var(--clr-text-muted);">${new Date(post.timestamp).toLocaleTimeString('vi-VN')}</span>
                                </div>
                            </div>
                            <span class="quadrant-badge badge-q2">${post.subject} • ${post.topic}</span>
                        </div>
                        <p style="font-size:14px; line-height:1.5; color:#fff; margin:0;">${post.content}</p>

                        <!-- Replies -->
                        <div style="display:flex; flex-direction:column; gap:6px; background:rgba(22,13,44,0.5); padding:10px; border-radius:var(--radius-md);">
                            ${(post.replies || []).map(r => `
                                <div style="font-size:12px; line-height:1.4;">
                                    <span style="color:var(--clr-cyan); font-weight:700;">${r.author}:</span> ${r.content}
                                </div>
                            `).join('')}
                        </div>

                        <!-- Actions -->
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-top:1px solid var(--clr-glass-border); padding-top:12px;">
                            <button class="btn btn-secondary btn-sm" onclick="StudyForumManager.replyToPost('${post.id}')">
                                💬 Bình Luận
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="StudyForumManager.pairRoomHelp('${post.id}')" style="background:linear-gradient(135deg, var(--clr-mint), var(--clr-cyan)); border:none; color:#130b26; font-weight:700;">
                                🤝 Ghép Phòng 1-1 Trợ Giúp (+50 XP)
                            </button>
                        </div>
                    `;
                    container.appendChild(card);
                });
            }
        } catch(e){}
    },

    openNewPostModal: () => {
        document.getElementById('modal-forum-newpost').style.display = 'flex';
    },

    submitPost: async () => {
        const sub = document.getElementById('forum-post-subject').value;
        const top = document.getElementById('forum-post-topic').value;
        const content = document.getElementById('forum-post-content').value.trim();

        if (!content) { alert('Vui lòng nhập nội dung câu hỏi!'); return; }

        const user = AuthManager.currentUser || { username: 'guest_' + Date.now(), name: 'Nhà Thám Hiểm', avatar: '💡' };

        try {
            const res = await fetch('/api/match/forum/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author: user.username,
                    name: user.name,
                    avatar: user.avatar,
                    subject: sub,
                    topic: top || 'Kiến thức chung',
                    content
                })
            });
            const data = await res.json();
            closeModals();
            if (data.success) {
                alert('✨ Đã đăng câu hỏi lên diễn đàn thành công!');
                document.getElementById('forum-post-content').value = '';
                StudyForumManager.loadPosts();
            }
        } catch(e){ alert('Lỗi khi gửi câu hỏi.'); }
    },

    replyToPost: async (postId) => {
        const reply = prompt('Nhập câu trả lời hoặc gợi ý của bạn:');
        if (!reply || !reply.trim()) return;

        const user = AuthManager.currentUser || { name: 'Bạn Học Vũ Trụ', avatar: '✨' };

        try {
            await fetch('/api/match/forum/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    author: user.name,
                    avatar: user.avatar,
                    content: reply.trim()
                })
            });
            LevelSystem.addXp(10);
            StudyForumManager.loadPosts();
        } catch(e){}
    },

    pairRoomHelp: async (postId) => {
        const user = AuthManager.currentUser || { username: 'helper_' + Date.now(), name: 'Bạn Học Tốt Bụng', avatar: '🌟' };

        try {
            const res = await fetch('/api/match/forum/pair-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, helperUser: user })
            });
            const data = await res.json();
            if (data.success && data.room) {
                alert(`🎉 ${data.message}`);
                LevelSystem.addXp(data.bonusXp || 50);
                AuthManager.syncToCloud();

                // Chuyển sang sub-tab phòng học và mở phòng 1-1
                StudyMatchManager.switchSubTab('rooms');
                StudyMatchManager.enterRoomView(data.room);
            }
        } catch(e){
            alert('Không thể tạo phòng ghép đôi lúc này.');
        }
    }
};

// Đảm bảo đóng tất cả modal khi nhấn nút đóng hoặc click ra vùng nền đen bên ngoài
window.closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
};

document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
        closeModals();
    }
});

// Khởi chạy các module khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
    AITutor.init();
    DashboardSiri.init();
    EisenhowerManager.init();
    StudyMatchManager.init();
});
