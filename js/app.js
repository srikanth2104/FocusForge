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
    darkMode: "focusforge_darkMode",
    pomodoro: "focusforge_pomodoro"
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
   SCREEN-READER STATUS ANNOUNCEMENTS
   One sr-only aria-live region (created on first use) tells
   screen-reader users about dynamic changes — added/deleted
   tasks, streak progress — which would otherwise be silent.
   ========================================================= */
let announceTimer = null;

function announce(message) {
    let region = document.getElementById("a11yStatus");
    if (!region) {
        region = document.createElement("p");
        region.id = "a11yStatus";
        region.className = "sr-only";
        region.setAttribute("aria-live", "polite");
        document.body.appendChild(region);
    }
    // Clear first so repeating the same message is still announced.
    region.textContent = "";
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
        region.textContent = message;
    }, 50);
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
    // The emoji alone is not a reliable accessible name, and it never
    // tells screen-reader users what the button will DO.
    toggleBtn.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
    );
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
            // "✓"/"✕" alone are meaningless to screen readers, and they
            // do not say WHICH task they act on.
            completeBtn.setAttribute(
                "aria-label",
                (task.completed ? "Undo task: " : "Mark task as complete: ") + task.text
            );
            completeBtn.addEventListener("click", () => toggleTaskComplete(task.id));

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "task-delete-btn";
            deleteBtn.textContent = "✕";
            deleteBtn.setAttribute("aria-label", "Delete task: " + task.text);
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
        announce("Task added.");
    }

    function toggleTaskComplete(id) {
        const tasks = getTasks();
        const task = tasks.find((t) => t.id === id);
        if (task) task.completed = !task.completed;
        saveTasks(tasks);
        renderTasks();

        // renderTasks() rebuilt every row, so keyboard focus would fall
        // back to <body>. Put it on the same row's button again.
        const btn = taskList.querySelector(`li[data-id="${id}"] .task-complete-btn`);
        if (btn) btn.focus();
        if (task) {
            announce(task.completed ? "Task marked complete." : "Task moved back to pending.");
        }
    }

    function deleteTask(id) {
        // Remember where the row was, so focus can land on the row that
        // took its place instead of jumping back to the top of the page.
        const oldIndex = Array.from(taskList.children)
            .findIndex((row) => row.dataset.id === id);

        const tasks = getTasks().filter((t) => t.id !== id);
        saveTasks(tasks);
        renderTasks();

        const rows = Array.from(taskList.children);
        const targetRow = rows[oldIndex] || rows[oldIndex - 1];
        const focusTarget = targetRow
            ? targetRow.querySelector(".task-complete-btn")
            : taskInput;
        if (focusTarget) focusTarget.focus();
        announce("Task deleted.");
    }

    if (addTaskBtn) {
        addTaskBtn.addEventListener("click", addTask);
    }
    if (taskInput) {
        taskInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") addTask();
        });
    }

    // Toggle aria-pressed together with the visual "active" class so
    // screen readers announce which filter is currently selected.
    function setActiveFilter(selectedBtn) {
        filterBtns.forEach((b) => {
            const isActive = b === selectedBtn;
            b.classList.toggle("active", isActive);
            b.setAttribute("aria-pressed", String(isActive));
        });
        currentFilter = selectedBtn.dataset.filter;
    }

    filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            setActiveFilter(btn);
            renderTasks();
            announce(`Showing ${btn.dataset.filter} tasks.`);
        });
    });

    // Set the initial aria-pressed state to match the HTML.
    filterBtns.forEach((btn) => {
        btn.setAttribute("aria-pressed", String(btn.classList.contains("active")));
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
            // Include the habit name so the action is clear when heard
            // out of context (the visible label alone doesn't say which).
            checkBtn.setAttribute(
                "aria-label",
                (doneToday ? "Already done today: " : "Mark habit done: ") + habit.text
            );
            checkBtn.addEventListener("click", () => markHabitDone(habit.id));

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "habit-delete-btn";
            deleteBtn.textContent = "✕";
            deleteBtn.setAttribute("aria-label", "Delete habit: " + habit.text);
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
        announce("Habit added.");
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

        // renderHabits() rebuilt the rows, and the "Done Today" button is
        // now disabled (disabled buttons can't hold focus), so move focus
        // to the row's delete button instead.
        const row = habitList.querySelector(`li[data-id="${id}"]`);
        const focusTarget = row ? row.querySelector(".habit-delete-btn") : null;
        if (focusTarget) focusTarget.focus();
        announce(
            `Habit done. Streak: ${habit.streak} day${habit.streak === 1 ? "" : "s"}.`
        );
    }

    function deleteHabit(id) {
        // Remember where the row was, so focus lands on the row that
        // takes its place rather than jumping to the top of the page.
        const oldIndex = Array.from(habitList.children)
            .findIndex((row) => row.dataset.id === id);

        const habits = getHabits().filter((h) => h.id !== id);
        saveHabits(habits);
        renderHabits();

        const rows = Array.from(habitList.children);
        const targetRow = rows[oldIndex] || rows[oldIndex - 1];
        let focusTarget = null;
        if (targetRow) {
            const check = targetRow.querySelector(".habit-check-btn");
            // Fall back to the delete button when the check button is
            // disabled (habit already done today).
            focusTarget = (check && !check.disabled)
                ? check
                : targetRow.querySelector(".habit-delete-btn");
        } else {
            focusTarget = habitInput;
        }
        if (focusTarget) focusTarget.focus();
        announce("Habit deleted.");
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

    // How many whole minutes of THIS session have already been added to
    // focusforge_focusMinutes. Reset to 0 whenever the timer goes back to
    // a fresh 25:00 (on Reset, or after a session completes naturally).
    // This is what stops Pause from saving the same minutes twice.
    let minutesSavedThisSession = 0;

    function render() {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        minutesEl.textContent = String(mins).padStart(2, "0");
        secondsEl.textContent = String(secs).padStart(2, "0");
    }

    // Saves any newly-completed whole minutes from the current running
    // session (i.e. the minutes elapsed since the last time we saved).
    // Safe to call multiple times in a row - if nothing new has elapsed,
    // it simply does nothing.
    function saveNewlyElapsedMinutes() {
        const elapsedSeconds = SESSION_MINUTES * 60 - totalSeconds;
        const minutesElapsed = Math.floor(elapsedSeconds / 60);

        // Never let a single session add more than SESSION_MINUTES in
        // total. This guards against totalSeconds ever being negative
        // (e.g. a running session was away long enough to pass 00:00) -
        // without this cap, elapsedSeconds could exceed the session
        // length and over-credit focus minutes.
        const maxMinutesRemaining = SESSION_MINUTES - minutesSavedThisSession;
        const minutesToAdd = Math.min(minutesElapsed - minutesSavedThisSession, maxMinutesRemaining);

        if (minutesToAdd > 0) {
            addFocusMinutes(minutesToAdd);
            minutesSavedThisSession += minutesToAdd;
            updateDashboardSummary();
        }
    }

    // ---------------------------------------------------------------
    // CROSS-PAGE PERSISTENCE
    // The Pomodoro timer state is saved to focusforge_pomodoro so that
    // navigating to another FocusForge page (a full page load, since
    // this is a multi-page site) can restore it instead of starting
    // over at 25:00. We store the remaining seconds, whether it was
    // running, the moment that snapshot was taken, and how many
    // minutes of the current session are already saved.
    // ---------------------------------------------------------------
    function persistState() {
        saveJSON(STORAGE_KEYS.pomodoro, {
            remainingSeconds: totalSeconds,
            isRunning: intervalId !== null,
            savedAt: Date.now(),
            minutesSaved: minutesSavedThisSession
        });
    }

    // Shared by both "timer hits 00:00 while this page is open" and
    // "timer would have hit 00:00 while the user was on another page".
    function completeSession() {
        saveNewlyElapsedMinutes(); // tops off to exactly SESSION_MINUTES total
        alert("Pomodoro session complete! Great focus.");
        totalSeconds = SESSION_MINUTES * 60;
        minutesSavedThisSession = 0;
        render();
        persistState();
    }

    function tick() {
        if (totalSeconds <= 0) {
            clearInterval(intervalId);
            intervalId = null;
            completeSession();
            return;
        }
        totalSeconds -= 1;
        render();
        persistState(); // keep "savedAt" fresh so navigating away stays accurate
    }

    function start() {
        if (intervalId) return; // already running
        intervalId = setInterval(tick, 1000);
        persistState();
    }

    function pause() {
        clearInterval(intervalId);
        intervalId = null;
        saveNewlyElapsedMinutes();
        persistState();
    }

    function reset() {
        // Reset discards the current, not-yet-saved partial session -
        // it deliberately does NOT call saveNewlyElapsedMinutes(). Minutes
        // already saved by an earlier Pause are left alone (not rolled back).
        clearInterval(intervalId);
        intervalId = null;
        totalSeconds = SESSION_MINUTES * 60;
        minutesSavedThisSession = 0;
        render();
        persistState();
    }

    // Restore whatever state was saved (by this page or another page)
    // before wiring up the buttons and doing the first render.
    function restoreState() {
        const saved = loadJSON(STORAGE_KEYS.pomodoro, null);

        if (!saved) {
            // Nothing saved yet (first time ever using the timer).
            render();
            persistState();
            return;
        }

        minutesSavedThisSession = saved.minutesSaved || 0;

        if (saved.isRunning) {
            // Figure out how much time passed while the user was away,
            // and fast-forward the remaining time by that much.
            const elapsedWhileAway = Math.floor((Date.now() - saved.savedAt) / 1000);
            totalSeconds = saved.remainingSeconds - elapsedWhileAway;

            if (totalSeconds <= 0) {
                // The session would have finished while the user was on
                // another page (or away from the tab). Count it once.
                totalSeconds = 0;
                completeSession();
            } else {
                render();
                start(); // keep counting down on this page too
            }
        } else {
            // Paused, or already reset to a fresh 25:00 - just restore it.
            totalSeconds = saved.remainingSeconds;
            render();
        }
    }

    if (startBtn) startBtn.addEventListener("click", start);
    if (pauseBtn) pauseBtn.addEventListener("click", pause);
    if (resetBtn) resetBtn.addEventListener("click", reset);

    restoreState();
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

    if (chartCanvas) {
        // The canvas is a picture of the four numbers already listed in
        // the .stats-summary above it — give screen readers the same
        // facts as a text alternative.
        chartCanvas.setAttribute("role", "img");
        chartCanvas.setAttribute(
            "aria-label",
            `Bar chart of your stats: ${completedCount} completed tasks, ` +
            `${pendingCount} pending tasks, ${focusMinutes} focus minutes, ` +
            `total habit streak ${totalStreak}.`
        );
    }

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
