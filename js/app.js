// To-Do List Life Dashboard - Main Application
(function() {
    "use strict";
    
    // ======================
    // 1. Configuration & State
    // ======================
    const CONFIG = {
        STORAGE_KEY: "todoLifeDashboard",
        TIMER_DURATION: 25 * 60, // Default 25 minutes in seconds
        UPDATE_INTERVALS: {
            TIME: 1000,     // Updated every second for live clock
            TIMER: 1000     // 1 second tick for focus timer
        }
    };
    
    // Application State
    let state = {
        todos: [],
        quickLinks: [],
        userName: "Friend", // Default user name
        theme: "light",     // Default theme mode
        currentSort: "newest",
        timer: {
            isRunning: false,
            remainingSeconds: CONFIG.TIMER_DURATION,
            intervalId: null
        }
    };

    // ======================
    // 2. Theme Manager
    // ======================

    /**
     * Apply theme (light/dark) to HTML attribute and update toggle button icon
     * @param {string} theme Mode ('light' or 'dark')
     */
    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        const themeBtn = document.getElementById("theme-toggle");
        if (themeBtn) {
            themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
        }
    }

    /**
     * Toggle theme state between light and dark
     */
    function toggleTheme() {
        state.theme = state.theme === "dark" ? "light" : "dark";
        saveState();
        applyTheme(state.theme);
    }
    
    // ======================
    // 3. Time & Greeting Functions
    // ======================

    // Variables for Web Audio API oscillator alarm fallback
    let alarmOscillator = null;
    let alarmAudioCtx = null;

    /**
     * Play repeating alarm beep sound using Web Audio API
     */
    function startAlarmSound() {
        try {
            alarmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            alarmOscillator = alarmAudioCtx.createOscillator();
            const gainNode = alarmAudioCtx.createGain();

            alarmOscillator.type = 'sine';
            alarmOscillator.frequency.setValueAtTime(880, alarmAudioCtx.currentTime); // Tone A5

            // Intermittent beep gain effect
            gainNode.gain.setValueAtTime(0.3, alarmAudioCtx.currentTime);
            
            alarmOscillator.connect(gainNode);
            gainNode.connect(alarmAudioCtx.destination);

            alarmOscillator.start();
        } catch (e) {
            console.log("Audio Error:", e);
        }
    }

    /**
     * Stop Web Audio API alarm sound
     */
    function stopAlarmSound() {
        if (alarmOscillator) {
            try {
                alarmOscillator.stop();
                alarmOscillator.disconnect();
            } catch (e) {}
            alarmOscillator = null;
        }
        if (alarmAudioCtx) {
            try {
                alarmAudioCtx.close();
            } catch (e) {}
            alarmAudioCtx = null;
        }
    }
    
    /**
     * Format time as HH:MM:SS (includes seconds)
     * @param {Date} date Date object
     * @returns {string} Formatted time string
     */
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
    }
    
    /**
     * Format date as a readable localized string
     * @param {Date} date Date object
     * @returns {string} Formatted date string
     */
    function formatDate(date) {
        const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
        return date.toLocaleDateString("en-US", options);
    }
    
    /**
     * Get greeting title and quote based on current hour of the day
     * @param {number} hour Current hour (0-23)
     * @returns {object} Greeting title & motivational quote
     */
    function getGreetingData(hour) {
        if (hour >= 5 && hour < 12) {
            return {
                greeting: "Good Morning! ☀️",
                quote: "Start your day with a smile and a boost of energy!"
            };
        } else if (hour >= 12 && hour < 17) {
            return {
                greeting: "Good Afternoon! 🌤️",
                quote: "Stay focused and consistent, you're getting closer to your goals!"
            };
        } else if (hour >= 17 && hour < 21) {
            return {
                greeting: "Good Evening! 🌆",
                quote: "Finish today's tasks well, appreciate your hard work!"
            };
        } else {
            return {
                greeting: "Good Night! 🌙",
                quote: "Time to rest your mind. Tomorrow is a new opportunity!"
            };
        }
    }
    
    /**
     * Update dynamic greeting, clock, and quote display
     */
    function updateGreeting() {
        const now = new Date();
        const currentTime = document.getElementById("current-time");
        const currentDate = document.getElementById("current-date");
        const greetingTitle = document.getElementById("greeting-title");
        const userNameEl = document.getElementById("user-name");
        const quoteSubtext = document.getElementById("quote-subtext");
        
        if (currentTime) currentTime.textContent = formatTime(now);
        if (currentDate) currentDate.textContent = formatDate(now);
        
        const greetingData = getGreetingData(now.getHours());
        if (greetingTitle) greetingTitle.textContent = greetingData.greeting;
        if (userNameEl) userNameEl.textContent = state.userName;
        if (quoteSubtext) quoteSubtext.textContent = `✨ ${greetingData.quote}`;
    }
    
    // ======================
    // 4. Timer Display & Overlay Controls
    // ======================
    
    /**
     * Format timer display as MM:SS
     * @param {number} seconds Total seconds
     * @returns {string} Formatted timer string
     */
    function formatTimerDisplay(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
        const secs = (seconds % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    }
    
    /**
     * Update timer display elements on main card and focus overlay
     */
    function updateTimerDisplay() {
        const display = document.getElementById("timer-display");
        const focusDisplay = document.getElementById("focus-timer-display");
        const formatted = formatTimerDisplay(state.timer.remainingSeconds);
        
        if (display) display.textContent = formatted;
        if (focusDisplay) focusDisplay.textContent = formatted;
    }

    /**
     * Open Full-Screen Focus Mode overlay
     */
    function openFocusOverlay() {
        const overlay = document.getElementById("focus-overlay");
        const greetingText = document.getElementById("focus-greeting-text");
        if (greetingText) {
            greetingText.textContent = `Shh... Focus Time, ${state.userName}! 🤫`;
        }
        if (overlay) overlay.classList.add("active");
    }

    /**
     * Close Full-Screen Focus Mode overlay
     */
    function closeFocusOverlay() {
        const overlay = document.getElementById("focus-overlay");
        if (overlay) overlay.classList.remove("active");
    }

    /**
     * Pause timer while keeping the Focus Overlay visible
     */
    function pauseTimer() {
        if (!state.timer.isRunning) return;
        
        if (state.timer.intervalId) {
            clearInterval(state.timer.intervalId);
            state.timer.intervalId = null;
        }
        state.timer.isRunning = false;
        
        updateTimerControls();
        updateOverlayPauseButton();
    }

    /**
     * Resume timer from pause state inside Focus Overlay
     */
    function resumeTimer() {
        if (state.timer.isRunning) return;

        state.timer.isRunning = true;
        updateTimerControls();
        updateOverlayPauseButton();

        state.timer.intervalId = setInterval(() => {
            if (state.timer.remainingSeconds > 0) {
                state.timer.remainingSeconds--;
                updateTimerDisplay();
                
                // Timer completed
                if (state.timer.remainingSeconds === 0) {
                    stopTimer();
                    
                    const audio = document.getElementById("timer-notification");
                    if (audio) {
                        audio.currentTime = 0;
                        audio.loop = true;
                        audio.play().catch(e => console.log("Audio play failed:", e));
                    }
                    
                    setTimeout(() => {
                        showTimerModal("Time is up! Take a short break or start a new session.", () => {
                            if (audio) {
                                audio.pause();
                                audio.currentTime = 0;
                                audio.loop = false;
                            }
                        });
                    }, 100);
                }
            }
        }, CONFIG.UPDATE_INTERVALS.TIMER);
    }

    /**
     * Update text and styling of overlay pause/resume button
     */
    function updateOverlayPauseButton() {
        const pauseBtn = document.getElementById("overlay-pause-btn");
        if (pauseBtn) {
            if (state.timer.isRunning) {
                pauseBtn.textContent = "⏸ Pause";
                pauseBtn.style.background = "var(--accent)";
                pauseBtn.style.color = "#5c3d00";
            } else {
                pauseBtn.textContent = "▶ Resume";
                pauseBtn.style.background = "var(--primary)";
                pauseBtn.style.color = "#003366";
            }
        }
    }

    // ======================
    // 5. Custom Modal UI System
    // ======================

    /**
     * Display Custom Modal for User Name Input/Edit
     * @param {string} titleText Modal header title
     * @param {string} initialValue Preset input name value
     * @param {function} onSave Callback function when saved
     */
    function showNameModal(titleText, initialValue, onSave) {
        const existingModal = document.getElementById("custom-name-modal");
        if (existingModal) existingModal.remove();

        const modal = document.createElement("div");
        modal.id = "custom-name-modal";
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4); display: flex; align-items: center;
            justify-content: center; z-index: 9999; backdrop-filter: blur(4px);
        `;

        modal.innerHTML = `
            <div style="background: #ffffff; padding: 1.8rem; border-radius: 20px; text-align: center; width: 90%; max-width: 360px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 2px solid var(--primary); animation: fadeIn 0.3s ease;">
                <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem; font-family: var(--font-heading); color: #333;">✨ ${titleText}</h3>
                <p style="margin-bottom: 1rem; color: #666; font-size: 0.9rem;">Enter your name to make your dashboard more personal!</p>
                
                <div class="modal-input-group" style="margin-bottom: 1rem;">
                    <input type="text" id="modal-user-name" value="${escapeHtml(initialValue)}" placeholder="Your name..." style="text-align: center; font-size: 1rem; font-weight: 600;">
                    <div id="modal-name-error" style="color: #ff6b6b; font-size: 0.85rem; margin-top: 0.5rem; display: none;">⚠️ Name cannot be empty!</div>
                </div>

                <div class="modal-actions">
                    <button id="save-name-modal" class="btn add" style="width: 100%; padding: 0.7rem;">Save Name</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const nameInput = document.getElementById("modal-user-name");
        const errorEl = document.getElementById("modal-name-error");

        if (nameInput) {
            nameInput.focus();
            nameInput.select();
            
            nameInput.addEventListener("input", () => {
                if (errorEl) errorEl.style.display = "none";
            });
        }

        const handleSave = () => {
            const name = nameInput.value.trim();
            if (name) {
                onSave(name);
                modal.remove();
            } else if (errorEl) {
                errorEl.style.display = "block";
            }
        };

        document.getElementById("save-name-modal").addEventListener("click", handleSave);
        nameInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleSave();
        });
    }

    /**
     * Display Custom Modal for Adding Quick Link (With Enter Key & Theme Support)
     * @param {function} onSave Callback function with name and url
     */
    function showAddLinkModal(onSave) {
        const existingModal = document.getElementById("custom-add-link-modal");
        if (existingModal) existingModal.remove();

        const modal = document.createElement("div");
        modal.id = "custom-add-link-modal";
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4); display: flex; align-items: center;
            justify-content: center; z-index: 9999; backdrop-filter: blur(4px);
        `;

        modal.innerHTML = `
            <div style="background: var(--modal-bg, #ffffff); padding: 1.8rem; border-radius: 20px; text-align: center; width: 90%; max-width: 380px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 2px solid #ffd166; animation: fadeIn 0.3s ease;">
                <h3 style="font-size: 1.3rem; margin-bottom: 1rem; font-family: var(--font-heading); color: var(--text, #333);">🔗 Add Quick Link</h3>
                
                <div class="modal-input-group">
                    <label for="modal-link-name">Website Name</label>
                    <input type="text" id="modal-link-name" placeholder="e.g. Google, GitHub">
                    
                    <label for="modal-link-url">Website URL</label>
                    <input type="text" id="modal-link-url" placeholder="e.g. google.com">
                </div>

                <div class="modal-actions">
                    <button id="cancel-link-modal" class="btn reset" style="background: #e2e8f0; color: #475569;">Cancel</button>
                    <button id="save-link-modal" class="btn add" style="background: #ffd166; color: #78350f;">+ Save Link</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const nameInput = document.getElementById("modal-link-name");
        const urlInput = document.getElementById("modal-link-url");
        if (nameInput) nameInput.focus();

        const closeModal = () => modal.remove();

        // 1. Function to process saving link input
        const handleSave = () => {
            const name = nameInput.value.trim();
            let url = urlInput.value.trim();
            
            if (name && url) {
                // Prepend https:// if protocol is missing
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    url = "https://" + url;
                }
                onSave(name, url);
                closeModal();
            } else {
                showError("Name and URL cannot be empty!", "add-link");
            }
        };

        // 2. Event listener for Save button click
        document.getElementById("save-link-modal").addEventListener("click", handleSave);

        // 3. Event listener for Cancel button click
        document.getElementById("cancel-link-modal").addEventListener("click", closeModal);

        // 4. Event listener for Enter Key inside input fields
        const handleEnterKey = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
            }
        };

        nameInput.addEventListener("keydown", handleEnterKey);
        urlInput.addEventListener("keydown", handleEnterKey);
    }

    /**
     * Display Custom Confirmation Modal for Deletion
     * @param {string} title Confirmation title
     * @param {string} message Confirmation warning text
     * @param {function} onConfirm Action to execute upon confirmation
     */
    function showConfirmModal(title, message, onConfirm) {
        const existingModal = document.getElementById("custom-confirm-modal");
        if (existingModal) existingModal.remove();

        const modal = document.createElement("div");
        modal.id = "custom-confirm-modal";
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4); display: flex; align-items: center;
            justify-content: center; z-index: 9999; backdrop-filter: blur(4px);
        `;

        modal.innerHTML = `
            <div style="background: #ffffff; padding: 1.8rem; border-radius: 20px; text-align: center; width: 90%; max-width: 360px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 2px solid #ff6b6b; animation: fadeIn 0.3s ease;">
                <h3 style="font-size: 1.3rem; margin-bottom: 0.8rem; font-family: var(--font-heading); color: #333;">⚠️ ${title}</h3>
                <p style="margin-bottom: 1.5rem; color: #666; font-size: 0.95rem;">${message}</p>
                <div style="display: flex; gap: 0.6rem;">
                    <button id="cancel-confirm-modal" class="btn reset" style="flex: 1; background: #e2e8f0; color: #475569;">Cancel</button>
                    <button id="ok-confirm-modal" class="btn stop" style="flex: 1; background: #ff6b6b; color: white;">Delete</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => modal.remove();

        document.getElementById("cancel-confirm-modal").addEventListener("click", closeModal);
        document.getElementById("ok-confirm-modal").addEventListener("click", () => {
            closeModal();
            if (onConfirm) onConfirm();
        });
    }

    /**
     * Display Custom Modal for Editing a Todo Task
     * @param {string} initialValue Current todo task text
     * @param {function} onSave Callback function executed on save
     */
    function showEditTodoModal(initialValue, onSave) {
        const existingModal = document.getElementById("custom-edit-todo-modal");
        if (existingModal) existingModal.remove();

        const modal = document.createElement("div");
        modal.id = "custom-edit-todo-modal";
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4); display: flex; align-items: center;
            justify-content: center; z-index: 9999; backdrop-filter: blur(4px);
        `;

        modal.innerHTML = `
            <div style="background: var(--modal-bg, #ffffff); padding: 1.8rem; border-radius: 20px; text-align: center; width: 90%; max-width: 360px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 2px solid var(--secondary); animation: fadeIn 0.3s ease;">
                <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem; font-family: var(--font-heading); color: var(--text);">✏️ Edit Task</h3>
                <p style="margin-bottom: 1rem; color: var(--text-light); font-size: 0.9rem;">Update your task details below:</p>
                
                <div class="modal-input-group" style="margin-bottom: 1rem;">
                    <input type="text" id="modal-todo-text" value="${escapeHtml(initialValue)}" placeholder="Task text..." style="text-align: center; font-size: 1rem; font-weight: 500;">
                    <div id="modal-todo-error" style="color: #ff6b6b; font-size: 0.85rem; margin-top: 0.5rem; display: none;"></div>
                </div>

                <div class="modal-actions">
                    <button id="cancel-edit-todo-modal" class="btn reset" style="background: #e2e8f0; color: #475569;">Cancel</button>
                    <button id="save-edit-todo-modal" class="btn add" style="background: var(--primary); color: #003366;">Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = document.getElementById("modal-todo-text");
        const errorEl = document.getElementById("modal-todo-error");

        if (input) {
            input.focus();
            input.select();
            
            input.addEventListener("input", () => {
                if (errorEl) errorEl.style.display = "none";
            });
        }

        const closeModal = () => modal.remove();

        const handleSave = () => {
            const cleanText = input.value.trim();
            
            if (!cleanText) {
                if (errorEl) {
                    errorEl.textContent = "⚠️ Task cannot be empty!";
                    errorEl.style.display = "block";
                }
                return;
            }

            // Check duplicate task (excluding current original text)
            const isDuplicate = state.todos.some(todo => 
                todo.text.trim().toLowerCase() === cleanText.toLowerCase() && 
                todo.text.trim().toLowerCase() !== initialValue.trim().toLowerCase()
            );

            if (isDuplicate) {
                if (errorEl) {
                    errorEl.textContent = "⚠️ This task already exists!";
                    errorEl.style.display = "block";
                }
                return;
            }

            onSave(cleanText);
            closeModal();
        };

        document.getElementById("cancel-edit-todo-modal").addEventListener("click", closeModal);
        document.getElementById("save-edit-todo-modal").addEventListener("click", handleSave);
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleSave();
        });
    }

    /**
     * Display Custom Modal so Audio Loop continues without browser alert freezing
     * @param {string} message Completion message
     * @param {function} onConfirm Action executed when user clicks OK
     */
    function showTimerModal(message, onConfirm) {
        const existingModal = document.getElementById("custom-timer-modal");
        if (existingModal) existingModal.remove();

        const modal = document.createElement("div");
        modal.id = "custom-timer-modal";
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4); display: flex; align-items: center;
            justify-content: center; z-index: 9999; backdrop-filter: blur(4px);
        `;

        modal.innerHTML = `
            <div style="background: #ffffff; padding: 2rem; border-radius: 20px; text-align: center; max-width: 360px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 2px solid var(--accent); animation: fadeIn 0.3s ease;">
                <h3 style="font-size: 1.4rem; margin-bottom: 0.8rem; font-family: var(--font-heading); color: #333;">🎉 Focus Session Finished!</h3>
                <p style="margin-bottom: 1.5rem; color: #666; font-size: 0.95rem;">${message}</p>
                <button id="close-timer-modal" class="btn start" style="width: 100%; padding: 0.7rem; font-size: 1rem;">OK</button>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById("close-timer-modal").addEventListener("click", () => {
            modal.remove();
            if (onConfirm) onConfirm();
        });
    }
    
    // ======================
    // 6. Pomodoro Timer Execution Module
    // ======================

    /**
     * Calculate total seconds from minutes and seconds input fields
     * @returns {number} Total duration in seconds
     */
    function getSecondsFromInput() {
        const minInput = document.getElementById("custom-minutes-input");
        const secInput = document.getElementById("custom-seconds-input");
        
        const minutes = minInput ? parseInt(minInput.value, 10) || 0 : 0;
        const seconds = secInput ? parseInt(secInput.value, 10) || 0 : 0;
        
        return (minutes * 60) + seconds;
    }
    
    /**
     * Start countdown timer
     */
    function startTimer() {
        if (state.timer.isRunning) return;
        
        // If remaining time is zero or uninitialized, calculate from inputs
        if (state.timer.remainingSeconds <= 0) {
            state.timer.remainingSeconds = getSecondsFromInput();
        }

        // Check if duration is valid
        if (state.timer.remainingSeconds <= 0) {
            showError("Please set a valid focus duration!", "custom-minutes-input");
            return;
        }

        state.timer.isRunning = true;
        openFocusOverlay();
        updateTimerControls();
        updateTimerDisplay();

        state.timer.intervalId = setInterval(() => {
            if (state.timer.remainingSeconds > 0) {
                state.timer.remainingSeconds--;
                updateTimerDisplay();
                
                // Timer completed
                if (state.timer.remainingSeconds === 0) {
                    stopTimer();
                    
                    const audio = document.getElementById("timer-notification");
                    if (audio) {
                        audio.currentTime = 0;
                        audio.loop = true; // Loop audio continuously
                        audio.play().catch(e => console.log("Audio play failed:", e));
                    }
                    
                    // Display custom modal (audio continues looping until OK is clicked)
                    setTimeout(() => {
                        showTimerModal("Time is up! Take a short break or start a new session.", () => {
                            if (audio) {
                                audio.pause();
                                audio.currentTime = 0;
                                audio.loop = false;
                            }
                        });
                    }, 100);
                }
            }
        }, CONFIG.UPDATE_INTERVALS.TIMER);
    }
    
    /**
     * Stop or pause countdown timer
     */
    function stopTimer() {
        if (state.timer.intervalId) {
            clearInterval(state.timer.intervalId);
            state.timer.intervalId = null;
        }
        state.timer.isRunning = false;
        
        closeFocusOverlay();
        updateTimerControls();
    }
    
    /**
     * Reset countdown timer to initial input value
     */
    function resetTimer() {
        stopTimer();
        state.timer.remainingSeconds = getSecondsFromInput();
        updateTimerDisplay();
        updateTimerControls();
    }
    
    /**
     * Update timer control button states (Start, Stop, Reset)
     */
    function updateTimerControls() {
        const startBtn = document.getElementById("start-timer");
        const stopBtn = document.getElementById("stop-timer");
        const resetBtn = document.getElementById("reset-timer");
        
        if (startBtn) startBtn.disabled = state.timer.isRunning;
        if (stopBtn) stopBtn.disabled = !state.timer.isRunning;
        if (resetBtn) resetBtn.disabled = state.timer.isRunning;
    }
    
    // Alias for function name compatibility
    const updateTimerButtonStates = updateTimerControls;
    
    // ======================
    // 7. Todo Data Model & UI
    // ======================
    
    /**
     * Create a new todo item object
     * @param {string} text Task description
     * @returns {object} Todo item data model
     */
    function createTodo(text) {
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            text: text.trim(),
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
    
    /**
     * Add a new todo item
     * @param {string} text Task description
     */
    function addTodo(text) {
        if (!validateTodoInput(text)) return;
        
        const todo = createTodo(text);
        state.todos.push(todo);
        saveState();
        renderTodos();
        showSuccess("Task added successfully!");
        
        // Clear input field
        const todoInput = document.getElementById("todo-input");
        if (todoInput) todoInput.value = "";
    }
    
    /**
     * Toggle completion status of a todo item
     * @param {string} id Todo ID
     */
    function toggleTodo(id) {
        const todo = state.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            todo.updatedAt = new Date().toISOString();
            saveState();
            renderTodos();
        }
    }
    
    /**
     * Delete a todo item by ID
     * @param {string} id Todo ID
     */
    function deleteTodo(id) {
        state.todos = state.todos.filter(t => t.id !== id);
        saveState();
        renderTodos();
    }
    
    /**
     * Render all todo items with sorting logic applied & completion counter
     */
    function renderTodos() {
        const container = document.getElementById("todo-items");
        if (!container) return;

        // 1. Calculate task progress statistics
        const total = state.todos.length;
        const completed = state.todos.filter(t => t.completed).length;

        // 2. Update todo header title with progress counter
        const todoHeader = document.querySelector(".todo-header h2");
        if (todoHeader) {
            todoHeader.innerHTML = `<span class="icon">📝</span> To-Do List <small style="font-size:0.8rem; font-weight:normal; color:var(--text-light);">(${completed}/${total})</small>`;
        }

        if (state.todos.length === 0) {
            container.innerHTML = `<div class="todo-empty">
                <p>No tasks yet. Add one above! 📝</p>
            </div>`;
            return;
        }

        // 3. Create shallow copy & apply sorting logic
        let sortedTodos = [...state.todos];

        if (state.currentSort === "newest") {
            sortedTodos.reverse();
        } else if (state.currentSort === "status") {
            sortedTodos.sort((a, b) => a.completed - b.completed);
        } else if (state.currentSort === "alphabetical") {
            sortedTodos.sort((a, b) => a.text.localeCompare(b.text));
        }

        // 4. Render todo items markup ONCE (including checkbox, text, edit & delete buttons)
        container.innerHTML = sortedTodos.map(todo => `
            <div class="todo-item ${todo.completed ? "completed" : ""}">
                <input type="checkbox" class="todo-checkbox" data-id="${todo.id}" ${todo.completed ? "checked" : ""}>
                <span class="todo-text" title="Double-click to edit">${escapeHtml(todo.text)}</span>
                <button class="todo-edit" data-id="${todo.id}" title="Edit task">✏️</button>
                <button class="todo-delete" data-id="${todo.id}" title="Delete task">🗑️</button>
            </div>
        `).join("");

        // 5. Event listener for Checkbox (Toggle completion)
        container.querySelectorAll(".todo-checkbox").forEach(checkbox => {
            checkbox.addEventListener("change", (e) => {
                toggleTodo(e.target.dataset.id);
            });
        });

        // 6. Event listener for Edit button (✏️)
        container.querySelectorAll(".todo-edit").forEach(button => {
            button.addEventListener("click", (e) => {
                const id = e.target.dataset.id;
                const todo = state.todos.find(t => t.id === id);
                if (!todo) return;

                showEditTodoModal(todo.text, (newText) => {
                    if (newText !== todo.text) {
                        todo.text = newText;
                        todo.updatedAt = new Date().toISOString();
                        saveState();
                        renderTodos();
                        showSuccess("Task updated successfully!");
                    }
                });
            });
        });

        // 7. Event listener for double-clicking task text
        container.querySelectorAll(".todo-text").forEach(textSpan => {
            textSpan.addEventListener("dblclick", (e) => {
                const item = e.target.closest(".todo-item");
                const checkbox = item.querySelector(".todo-checkbox");
                const id = checkbox.dataset.id;
                const todo = state.todos.find(t => t.id === id);
                if (!todo) return;

                showEditTodoModal(todo.text, (newText) => {
                    if (newText !== todo.text) {
                        todo.text = newText;
                        todo.updatedAt = new Date().toISOString();
                        saveState();
                        renderTodos();
                        showSuccess("Task updated successfully!");
                    }
                });
            });
        });

        // 8. Event listener for Delete button (🗑️)
        container.querySelectorAll(".todo-delete").forEach(button => {
            button.addEventListener("click", (e) => {
                const id = e.target.dataset.id;
                showConfirmModal(
                    "Delete Task?",
                    "Are you sure you want to delete this task?",
                    () => deleteTodo(id)
                );
            });
        });
    }

    /**
     * Simple HTML text sanitization helper
     * @param {string} str Raw string
     * @returns {string} Sanitized string
     */
    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        })[m]);
    }
    
    // ======================
    // 8. Quick Links Model & UI
    // ======================
    
    /**
     * Create a new quick link item object
     * @param {string} name Website name
     * @param {string} url Website URL
     * @returns {object} Quick link object
     */
    function createQuickLink(name, url) {
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            url: url.trim(),
            createdAt: new Date().toISOString()
        };
    }
    
    /**
     * Add a new quick link
     * @param {string} name Website name
     * @param {string} url Website URL
     */
    function addQuickLink(name, url) {
        if (!validateLinkInput(name, url)) return;
        
        // Ensure URL has explicit HTTP/HTTPS protocol
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        
        const link = createQuickLink(name, url);
        state.quickLinks.push(link);
        saveState();
        renderQuickLinks();
        
        // Display success notification under Quick Links card
        showSuccess("Link added successfully!", "add-link");
    }
    
    /**
     * Delete a quick link by ID
     * @param {string} id Link ID
     */
    function deleteQuickLink(id) {
        state.quickLinks = state.quickLinks.filter(link => link.id !== id);
        saveState();
        renderQuickLinks();
    }
    
    /**
     * Render all quick link cards
     */
    function renderQuickLinks() {
        const container = document.getElementById("links-grid");
        if (!container) return;
        
        if (state.quickLinks.length === 0) {
            container.innerHTML = `<div class="link-empty">
                <p>Add your favorite websites! 🌐</p>
            </div>`;
            return;
        }

        // Helper function to extract website favicon using Google Favicon API
        function getFaviconUrl(url) {
            try {
                const domain = new URL(url).hostname;
                return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            } catch (e) {
                return null;
            }
        }

        // Render quick link buttons with real website favicons
        container.innerHTML = state.quickLinks.map(link => {
            const faviconUrl = getFaviconUrl(link.url);
            const iconHtml = faviconUrl 
                ? `<img src="${faviconUrl}" alt="${escapeHtml(link.name)}" style="width:16px; height:16px; vertical-align:middle; margin-right:4px;">`
                : `<span>🌐</span>`;

            return `
                <div class="link-item" data-id="${link.id}">
                    <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-button">
                        ${iconHtml}
                        <span class="link-name">${escapeHtml(link.name)}</span>
                    </a>
                    <button class="link-edit" title="Edit Link">✏️</button>
                    <button class="link-delete" title="Delete link">✖</button>
                </div>
            `;
        }).join("");

        // Add event listeners for edit buttons
        container.querySelectorAll(".link-edit").forEach(button => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                const linkItem = e.target.closest(".link-item");
                const id = linkItem.dataset.id;
                const link = state.quickLinks.find(l => l.id === id);
                if (!link) return;

                showEditLinkModal(link.name, link.url, (newName, newUrl) => {
                    link.name = newName;
                    link.url = newUrl;
                    saveState();
                    renderQuickLinks();
                    showSuccess("Link updated successfully!", "add-link");
                });
            });
        });
        
        // Add event listeners for delete buttons with confirmation modal
        container.querySelectorAll(".link-delete").forEach((button, index) => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                const linkId = state.quickLinks[index].id;
                showConfirmModal(
                    "Delete Quick Link?",
                    "Are you sure you want to delete this quick link?",
                    () => deleteQuickLink(linkId)
                );
            });
        });
    }

    /**
     * Display Custom Modal for Editing a Quick Link (With Enter Key support)
     * @param {string} initialName Current link name
     * @param {string} initialUrl Current link URL
     * @param {function} onSave Callback function executed on save
     */
    function showEditLinkModal(initialName, initialUrl, onSave) {
        const existingModal = document.getElementById("custom-edit-link-modal");
        if (existingModal) existingModal.remove();

        const modal = document.createElement("div");
        modal.id = "custom-edit-link-modal";
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4); display: flex; align-items: center;
            justify-content: center; z-index: 9999; backdrop-filter: blur(4px);
        `;

        modal.innerHTML = `
            <div style="background: var(--modal-bg, #ffffff); padding: 1.8rem; border-radius: 20px; text-align: center; width: 90%; max-width: 380px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 2px solid #ffd166; animation: fadeIn 0.3s ease;">
                <h3 style="font-size: 1.3rem; margin-bottom: 1rem; font-family: var(--font-heading); color: var(--text);">✏️ Edit Quick Link</h3>
                
                <div class="modal-input-group">
                    <label for="modal-edit-link-name">Website Name</label>
                    <input type="text" id="modal-edit-link-name" value="${escapeHtml(initialName)}" placeholder="e.g. Google, GitHub">
                    
                    <label for="modal-edit-link-url">Website URL</label>
                    <input type="text" id="modal-edit-link-url" value="${escapeHtml(initialUrl)}" placeholder="e.g. google.com">
                </div>

                <div class="modal-actions">
                    <button id="cancel-edit-link-modal" class="btn reset" style="background: #e2e8f0; color: #475569;">Cancel</button>
                    <button id="save-edit-link-modal" class="btn add" style="background: #ffd166; color: #78350f;">Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const nameInput = document.getElementById("modal-edit-link-name");
        const urlInput = document.getElementById("modal-edit-link-url");

        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }

        const closeModal = () => modal.remove();

        const handleSave = () => {
            const name = nameInput.value.trim();
            let url = urlInput.value.trim();
            
            if (name && url) {
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    url = "https://" + url;
                }
                onSave(name, url);
                closeModal();
            } else {
                showError("Name and URL cannot be empty!", "add-link");
            }
        };

        // Event listener for Save button click
        document.getElementById("save-edit-link-modal").addEventListener("click", handleSave);

        // Event listener for Cancel button click
        document.getElementById("cancel-edit-link-modal").addEventListener("click", closeModal);

        // Event listener to handle Enter key inside both input fields
        const handleEnterKey = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
            }
        };

        nameInput.addEventListener("keydown", handleEnterKey);
        urlInput.addEventListener("keydown", handleEnterKey);
    }
    
    // ======================
    // 9. LocalStorage Data Manager
    // ======================
    
    /**
     * Save application state to Local Storage
     */
    function saveState() {
        try {
            const data = {
                todos: state.todos,
                quickLinks: state.quickLinks,
                userName: state.userName,
                theme: state.theme
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save to Local Storage:", error);
        }
    }
    
    /**
     * Load application state from Local Storage
     */
    function loadState() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                state.todos = data.todos || [];
                state.quickLinks = data.quickLinks || [];
                state.userName = data.userName || "Friend";
                state.theme = data.theme || "light";
            }
        } catch (error) {
            console.error("Failed to load from Local Storage:", error);
        }
    }

    // ======================
    // 10. Input Validation & User Feedback
    // ======================

    /**
     * Show error message below target element
     * @param {string} message Error message
     * @param {string} elementId Element ID to highlight (optional)
     */
    function showError(message, elementId = "todo-input") {
        const existingErrors = document.querySelectorAll(".error-message");
        existingErrors.forEach(el => el.remove());

        const errorEl = document.createElement("div");
        errorEl.className = "error-message";
        errorEl.innerHTML = `<span style="color: #ff6b6b;">⚠️ ${message}</span>`;
        errorEl.style.cssText = `
            background: #fff5f5;
            border: 2px solid #ff6b6b;
            border-radius: 8px;
            padding: 10px;
            margin: 10px 0;
            animation: fadeIn 0.3s ease;
            width: 100%;
        `;
        
        const targetEl = document.getElementById(elementId);
        if (targetEl) {
            // Get wrapper element so notification inserts directly below input row
            const container = targetEl.closest(".todo-input") || targetEl;
            container.parentNode.insertBefore(errorEl, container.nextSibling);
            
            setTimeout(() => {
                if (errorEl.parentNode) {
                    errorEl.style.opacity = "0";
                    errorEl.style.transition = "opacity 0.3s ease";
                    setTimeout(() => {
                        if (errorEl.parentNode) errorEl.parentNode.removeChild(errorEl);
                    }, 300);
                }
            }, 3000);
        }
    }

    /**
     * Show success message below target element
     * @param {string} message Success message
     * @param {string} elementId Target element ID (optional)
     */
    function showSuccess(message, elementId = "todo-input") {
        const existingSuccess = document.querySelectorAll(".success-message");
        existingSuccess.forEach(el => el.remove());

        const successEl = document.createElement("div");
        successEl.className = "success-message";
        successEl.innerHTML = `<span style="color: #51cf66;">✅ ${message}</span>`;
        successEl.style.cssText = `
            background: #ebfbee;
            border: 2px solid #51cf66;
            border-radius: 8px;
            padding: 10px;
            margin: 10px 0;
            animation: fadeIn 0.3s ease;
            width: 100%;
        `;
        
        const targetEl = document.getElementById(elementId);
        if (targetEl) {
            // Get wrapper element so notification inserts directly below input row
            const container = targetEl.closest(".todo-input") || targetEl;
            container.parentNode.insertBefore(successEl, container.nextSibling);
            
            setTimeout(() => {
                if (successEl.parentNode) {
                    successEl.style.opacity = "0";
                    successEl.style.transition = "opacity 0.3s ease";
                    setTimeout(() => {
                        if (successEl.parentNode) successEl.parentNode.removeChild(successEl);
                    }, 300);
                }
            }, 2000);
        }
    }

    /**
     * Validate todo task input
     * @param {string} text Todo text
     * @returns {boolean} True if valid
     */
    function validateTodoInput(text) {
        const cleanText = text.trim().toLowerCase();

        if (!cleanText) {
            showError("Task cannot be empty!", "todo-input");
            return false;
        }
        
        if (text.length > 200) {
            showError("Task is too long (max 200 characters)", "todo-input");
            return false;
        }

        // DUPLICATE CHECK: Verify if task already exists in state.todos
        const isDuplicate = state.todos.some(todo => todo.text.trim().toLowerCase() === cleanText);
        if (isDuplicate) {
            showError("This task is already in your list!", "todo-input");
            return false;
        }
            
        return true;
    }

    /**
     * Validate quick link inputs
     * @param {string} name Website name
     * @param {string} url Website URL
     * @returns {boolean} True if valid
     */
    function validateLinkInput(name, url) {
        if (!name || !name.trim()) {
            showError("Website name cannot be empty!", "add-link");
            return false;
        }
        
        if (!url || !url.trim()) {
            showError("Website URL cannot be empty!", "add-link");
            return false;
        }
        
        const urlPattern = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]{2,}(\/.*)?$/i;
        if (!urlPattern.test(url) && !url.startsWith("http://") && !url.startsWith("https://")) {
            showError("Please enter a valid URL (e.g., example.com or https://example.com)", "add-link");
            return false;
        }
        
        return true;
    }
    
    // ======================
    // 11. Event Listeners Setup
    // ======================
    
    /**
     * Set up all DOM event listeners
     */
    function setupEventListeners() {
        // Theme toggle button
        const themeToggleBtn = document.getElementById("theme-toggle");
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener("click", toggleTheme);
        }
        
        // Editable user name click listener
        const userNameEl = document.getElementById("user-name");
        if (userNameEl) {
            userNameEl.addEventListener("click", () => {
                showNameModal("Change Your Name", state.userName, (newName) => {
                    state.userName = newName;
                    saveState();
                    updateGreeting();
                    showSuccess("Name updated successfully!", "greeting-text");
                });
            });
        }

        // Focus Overlay Controls
        const overlayPauseBtn = document.getElementById("overlay-pause-btn");
        const overlayStopBtn = document.getElementById("overlay-stop-btn");

        if (overlayPauseBtn) {
            overlayPauseBtn.addEventListener("click", () => {
                if (state.timer.isRunning) {
                    pauseTimer();
                } else {
                    resumeTimer();
                }
            });
        }
        
        if (overlayStopBtn) {
            overlayStopBtn.addEventListener("click", () => {
                stopTimer(); // Menghentikan timer & menutup layar overlay
            });
        }
        
        // Timer action buttons
        const startBtn = document.getElementById("start-timer");
        const stopBtn = document.getElementById("stop-timer");
        const resetBtn = document.getElementById("reset-timer");
        const minInput = document.getElementById("custom-minutes-input");
        const secInput = document.getElementById("custom-seconds-input");

        if (startBtn) startBtn.addEventListener("click", startTimer);
        if (stopBtn) stopBtn.addEventListener("click", stopTimer);
        if (resetBtn) resetBtn.addEventListener("click", resetTimer);

        // Add 'input' and 'change' listeners for instant time updates when timer is idle
        [minInput, secInput].forEach(input => {
            if (input) {
                ["input", "change"].forEach(eventType => {
                    input.addEventListener(eventType, () => {
                        if (!state.timer.isRunning) {
                            resetTimer();
                        }
                    });
                });
            }
        });

        // Event listeners for preset timer buttons
        document.querySelectorAll(".preset-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                if (state.timer.isRunning) return;
                const min = e.target.dataset.min;
                const sec = e.target.dataset.sec;
                
                document.getElementById("custom-minutes-input").value = min;
                document.getElementById("custom-seconds-input").value = sec;
                resetTimer();
            });
        });
        
        // Todo input submission and validation reset
        const todoInput = document.getElementById("todo-input");
        const addTodoBtn = document.getElementById("add-todo");
        
        if (addTodoBtn && todoInput) {
            addTodoBtn.addEventListener("click", () => {
                addTodo(todoInput.value);
            });
            
            todoInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    addTodo(todoInput.value);
                }
            });
            
            todoInput.addEventListener("input", () => {
                todoInput.style.borderColor = "";
                todoInput.style.boxShadow = "";
            });
        }

        // Event listener for task sorting dropdown
        const sortSelect = document.getElementById("sort-select");
        if (sortSelect) {
            sortSelect.addEventListener("change", (e) => {
                state.currentSort = e.target.value;
                renderTodos();
            });
        }
        
        // Quick links modal prompt listener
        const addLinkBtn = document.getElementById("add-link");
        if (addLinkBtn) {
            addLinkBtn.addEventListener("click", () => {
                showAddLinkModal((name, url) => {
                    addQuickLink(name, url);
                });
            });
        }

        // Handle Enter keypress on Add Quick Link input fields
        const linkNameInput = document.getElementById("link-name-input");
        const linkUrlInput = document.getElementById("link-url-input");
        
        const handleAddLinkEnter = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                addQuickLink(); // Call your existing add link function
            }
        };

        if (linkNameInput) linkNameInput.addEventListener("keydown", handleAddLinkEnter);
        if (linkUrlInput) linkUrlInput.addEventListener("keydown", handleAddLinkEnter);

        // Global Keyboard Shortcuts Listener (Esc & Spacebar)
        document.addEventListener("keydown", (e) => {
            // Press Escape to exit Focus Overlay or dismiss active modals
            if (e.key === "Escape") {
                const focusOverlay = document.getElementById("focus-overlay");
                if (focusOverlay && focusOverlay.classList.contains("active")) {
                    stopTimer();
                }
            }

            // Press Spacebar to toggle Pause/Resume inside Focus Overlay
            if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
                const focusOverlay = document.getElementById("focus-overlay");
                if (focusOverlay && focusOverlay.classList.contains("active")) {
                    e.preventDefault();
                    if (state.timer.isRunning) {
                        pauseTimer();
                    } else {
                        resumeTimer();
                    }
                }
            }
        });
    }

    // Add CSS keyframe animation for fadeIn feedback messages dynamically
    const style = document.createElement("style");
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
    
    // ======================
    // 12. Initialization Module
    // ======================
    
    /**
     * Initialize the dashboard application
     */
    function init() {
        // Load saved state from Local Storage
        loadState();

        // If user name is default or empty on first visit, show name prompt modal
        if (!localStorage.getItem(CONFIG.STORAGE_KEY) || state.userName === "Friend") {
            setTimeout(() => {
                showNameModal("Welcome! 👋", "", (newName) => {
                    state.userName = newName;
                    saveState();
                    updateGreeting();
                });
            }, 400);
        }

        // Apply saved theme mode
        applyTheme(state.theme);
        
        // Set up initial displays & reset timer display
        updateGreeting();
        resetTimer();
        
        // Render data modules
        renderTodos();
        renderQuickLinks();
        
        // Set up DOM event listeners
        setupEventListeners();
        
        // Start real-time clock updates
        setInterval(updateGreeting, CONFIG.UPDATE_INTERVALS.TIME);
        
        console.log("To-Do List Life Dashboard initialized! 🎉");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();