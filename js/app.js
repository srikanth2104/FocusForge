/* =========================================================
   FocusForge - app.js
   (Migrated from script.js during Phase 2 — logic unchanged.)

   Shared application logic powering the app pages:
   index.html (dashboard, for now), tasks.html, habits.html,
   stats.html. Every init function guards itself so this same
   file can safely run on pages missing some elements.
   ========================================================= */

/* ---------- LocalStorage keys ---------- */
const STORAGE_KEYS = {
    tasks: "focusforge_tasks",
    habits: "focusforge_habits",
    focusMinutes: "focusforge_focusMinutes",
    darkMode: "focusforge_darkMode"
};

/* ---------- Generic storage helpers ---------- */
function loadJSON(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getTasks() {
    return loadJSON(STORAGE_KEYS.tasks, []);
}

function saveTasks(tasks) {
    saveJSON(STORAGE_KEYS.tasks, tasks);
}

function getHabits() {
    return loadJSON(STORAGE_KEYS.habits, []);
}

function saveHabits(habits) {
    saveJSON(STORAGE_KEYS.habits, habits);
}

function getFocusMinutes() {
    const value = parseInt(localStorage.getItem(STORAGE_KEYS.focusMinutes), 10);
    return isNaN(value) ? 0 : value;
}

function saveFocusMinutes(minutes) {
    localStorage.setItem(STORAGE_KEYS.focusMinutes, String(minutes));
}

function addFocusMinutes(amount) {
    const total = getFocusMinutes() + amount;
    saveFocusMinutes(total);
    return total;
}

/* Simple unique id generator (good enough for local demo data) */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayString() {
    return new Date().toDateString();
}

/* =========================================================
   DARK MODE (all pages)
   ========================================================= */
function initDarkMode() {
    const toggleBtn = document.getElementById("darkModeToggle");
    const isDark = localStorage.getItem(STORAGE_KEYS.darkMode) === "true";

    if (isDark) {
        document.body.classList.add("dark");
    }
    updateDarkModeIcon(toggleBtn, isDark);

    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
        const nowDark = document.body.classList.toggle("dark");
        localStorage.setItem(STORAGE_KEYS.darkMode, String(nowDark));
        updateDarkModeIcon(toggleBtn, nowDark);
    });
}

function updateDarkModeIcon(toggleBtn, isDark) {
    if (!toggleBtn) return;
    toggleBtn.textContent = isDark ? "☀️" : "🌙";
}

/* =========================================================
   TASKS (tasks.html + dashboard summary on index.html)
   ========================================================= */
function initTasksPage() {
    const taskInput = document.getElementById("taskInput");
    const addTaskBtn = document.getElementById("addTaskBtn");
    const taskList = document.getElementById("taskList");
    const emptyMessage = document.getElementById("emptyMessage");
    const filterBtns = document.querySelectorAll(".filter-btn");

    // If the task list doesn't exist on this page, skip entirely.
    if (!taskList) return;

    let currentFilter = "all";

    function renderTasks() {
        const tasks = getTasks();
        const filtered = tasks.filter((task) => {
            if (currentFilter === "completed") return task.completed;
            if (currentFilter === "pending") return !task.completed;
            return true;
        });

        taskList.innerHTML = "";

        filtered.forEach((task) => {
            const li = document.createElement("li");
            li.dataset.id = task.id;
            if (task.completed) li.classList.add("completed");

            const span = document.createElement("span");
            span.className = "task-text";
            span.textContent = task.text;

            const actions = document.createElement("div");
            actions.className = "task-actions";

            const completeBtn = document.createElement("button");
            completeBtn.className = "task-complete-btn";
            completeBtn.textContent = task.completed ? "Undo" : "✓";
            completeBtn.addEventListener("click", () => toggleTaskComplete(task.id));

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "task-delete-btn";
            deleteBtn.textContent = "✕";
            deleteBtn.addEventListener("click", () => deleteTask(task.id));

            actions.appendChild(completeBtn);
            actions.appendChild(deleteBtn);

            li.appendChild(span);
            li.appendChild(actions);
            taskList.appendChild(li);
        });

        // Empty state only reflects the current filter's results
        if (emptyMessage) {
            emptyMessage.style.display = filtered.length === 0 ? "block" : "none";
        }

        updateDashboardSummary();
    }

    function addTask() {
        const text = taskInput.value.trim();
        if (!text) return;

        const tasks = getTasks();
        tasks.push({ id: generateId(), text: text, completed: false });
        saveTasks(tasks);

        taskInput.value = "";
        renderTasks();
    }

    function toggleTaskComplete(id) {
        const tasks = getTasks();
        const task = tasks.find((t) => t.id === id);
        if (task) task.completed = !task.completed;
        saveTasks(tasks);
        renderTasks();
    }

    function deleteTask(id) {
        const tasks = getTasks().filter((t) => t.id !== id);
        saveTasks(tasks);
        renderTasks();
    }

    if (addTaskBtn) {
        addTaskBtn.addEventListener("click", addTask);
    }
    if (taskInput) {
        taskInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") addTask();
        });
    }

    filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            filterBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    renderTasks();
}

/* =========================================================
   HABITS (habits.html)
   ========================================================= */
function initHabitsPage() {
    const habitInput = document.getElementById("habitInput");
    const addHabitBtn = document.getElementById("addHabitBtn");
    const habitList = document.getElementById("habitList");

    if (!habitList) return;

    function renderHabits() {
        const habits = getHabits();
        habitList.innerHTML = "";

        habits.forEach((habit) => {
            const li = document.createElement("li");
            li.dataset.id = habit.id;

            const doneToday = habit.lastDone === todayString();
            if (doneToday) li.classList.add("completed");

            const span = document.createElement("span");
            span.className = "habit-text";
            span.textContent = `${habit.text} — 🔥 ${habit.streak} day${habit.streak === 1 ? "" : "s"}`;

            const actions = document.createElement("div");
            actions.className = "habit-actions";

            const checkBtn = document.createElement("button");
            checkBtn.className = "habit-check-btn";
            checkBtn.textContent = doneToday ? "Done Today" : "Mark Done";
            checkBtn.disabled = doneToday;
            checkBtn.addEventListener("click", () => markHabitDone(habit.id));

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "habit-delete-btn";
            deleteBtn.textContent = "✕";
            deleteBtn.addEventListener("click", () => deleteHabit(habit.id));

            actions.appendChild(checkBtn);
            actions.appendChild(deleteBtn);

            li.appendChild(span);
            li.appendChild(actions);
            habitList.appendChild(li);
        });

        updateDashboardSummary();
    }

    function addHabit() {
        const text = habitInput.value.trim();
        if (!text) return;

        const habits = getHabits();
        habits.push({ id: generateId(), text: text, streak: 0, lastDone: null });
        saveHabits(habits);

        habitInput.value = "";
        renderHabits();
    }

    function markHabitDone(id) {
        const habits = getHabits();
        const habit = habits.find((h) => h.id === id);
        if (!habit) return;

        const today = todayString();
        if (habit.lastDone === today) return; // already counted today

        // Check if the previous completion was "yesterday" to keep the streak alive,
        // otherwise the streak restarts at 1.
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (habit.lastDone === yesterday.toDateString()) {
            habit.streak += 1;
        } else {
            habit.streak = 1;
        }
        habit.lastDone = today;

        saveHabits(habits);
        renderHabits();
    }

    function deleteHabit(id) {
        const habits = getHabits().filter((h) => h.id !== id);
        saveHabits(habits);
        renderHabits();
    }

    if (addHabitBtn) {
        addHabitBtn.addEventListener("click", addHabit);
    }
    if (habitInput) {
        habitInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") addHabit();
        });
    }

    renderHabits();
}

/* =========================================================
   POMODORO TIMER (index.html)
   ========================================================= */
function initPomodoro() {
    const minutesEl = document.getElementById("minutes");
    const secondsEl = document.getElementById("seconds");
    const startBtn = document.getElementById("startTimer");
    const pauseBtn = document.getElementById("pauseTimer");
    const resetBtn = document.getElementById("resetTimer");

    if (!minutesEl || !secondsEl) return;

    const SESSION_MINUTES = 25;
    let totalSeconds = SESSION_MINUTES * 60;
    let intervalId = null;

    function render() {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        minutesEl.textContent = String(mins).padStart(2, "0");
        secondsEl.textContent = String(secs).padStart(2, "0");
    }

    function tick() {
        if (totalSeconds <= 0) {
            clearInterval(intervalId);
            intervalId = null;
            addFocusMinutes(SESSION_MINUTES);
            updateDashboardSummary();
            alert("Pomodoro session complete! Great focus.");
            totalSeconds = SESSION_MINUTES * 60;
            render();
            return;
        }
        totalSeconds -= 1;
        render();
    }

    function start() {
        if (intervalId) return; // already running
        intervalId = setInterval(tick, 1000);
    }

    function pause() {
        clearInterval(intervalId);
        intervalId = null;
    }

    function reset() {
        pause();
        totalSeconds = SESSION_MINUTES * 60;
        render();
    }

    if (startBtn) startBtn.addEventListener("click", start);
    if (pauseBtn) pauseBtn.addEventListener("click", pause);
    if (resetBtn) resetBtn.addEventListener("click", reset);

    render();
}

/* =========================================================
   DASHBOARD SUMMARY (index.html cards)
   ========================================================= */
function updateDashboardSummary() {
    const taskCountEl = document.getElementById("taskCount");
    const streakCountEl = document.getElementById("streakCount");
    const focusTimeEl = document.getElementById("focusTime");

    // Skip quietly if these cards aren't on the current page.
    if (!taskCountEl && !streakCountEl && !focusTimeEl) return;

    if (taskCountEl) {
        const tasks = getTasks();
        const pendingCount = tasks.filter((t) => !t.completed).length;
        taskCountEl.textContent = `${pendingCount} Task${pendingCount === 1 ? "" : "s"}`;
    }

    if (streakCountEl) {
        const habits = getHabits();
        const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);
        streakCountEl.textContent = `${bestStreak} Day${bestStreak === 1 ? "" : "s"}`;
    }

    if (focusTimeEl) {
        focusTimeEl.textContent = `${getFocusMinutes()} mins`;
    }
}

/* =========================================================
   STATS PAGE (stats.html)
   ========================================================= */
function initStatsPage() {
    const totalTasksEl = document.getElementById("totalTasks");
    const completedTasksEl = document.getElementById("completedTasks");
    const pendingTasksEl = document.getElementById("pendingTasks");
    const totalFocusEl = document.getElementById("totalFocus");
    const totalStreakEl = document.getElementById("totalStreak");
    const chartCanvas = document.getElementById("statsChart");

    // If none of the stats elements exist, this isn't the stats page.
    if (!totalTasksEl && !chartCanvas) return;

    const tasks = getTasks();
    const habits = getHabits();
    const completedCount = tasks.filter((t) => t.completed).length;
    const pendingCount = tasks.length - completedCount;
    const totalStreak = habits.reduce((sum, h) => sum + h.streak, 0);
    const focusMinutes = getFocusMinutes();

    if (totalTasksEl) totalTasksEl.textContent = tasks.length;
    if (completedTasksEl) completedTasksEl.textContent = completedCount;
    if (pendingTasksEl) pendingTasksEl.textContent = pendingCount;
    if (totalFocusEl) totalFocusEl.textContent = focusMinutes;
    if (totalStreakEl) totalStreakEl.textContent = totalStreak;

    if (chartCanvas && typeof Chart !== "undefined") {
        new Chart(chartCanvas, {
            type: "bar",
            data: {
                labels: ["Completed Tasks", "Pending Tasks", "Focus Minutes", "Total Habit Streak"],
                datasets: [
                    {
                        label: "FocusForge Stats",
                        data: [completedCount, pendingCount, focusMinutes, totalStreak],
                        backgroundColor: ["#22c55e", "#f97316", "#38bdf8", "#a855f7"]
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

/* =========================================================
   INIT - runs on every page, each function guards itself
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    initDarkMode();
    initTasksPage();
    initHabitsPage();
    initPomodoro();
    initStatsPage();
    updateDashboardSummary();
});
