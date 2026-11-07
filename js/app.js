// To-Do List Life Dashboard - Main Application
(function() {
    "use strict";
    
    // Configuration
    const CONFIG = {
        STORAGE_KEY: "todoLifeDashboard",
        TIMER_DURATION: 25 * 60, // 25 minutes in seconds
        UPDATE_INTERVALS: {
            TIME: 1000,     // 1 second (diperbarui setiap detik untuk detik)
            TIMER: 1000     // 1 second
        }
    };
    
    // Application State
    let state = {
        todos: [],
        quickLinks: [],
        userName: "Friend", // default name
        timer: {
            isRunning: false,
            remainingSeconds: CONFIG.TIMER_DURATION,
            intervalId: null
        }
    };
    
    // ======================
    // 2.2 Time Formatting Functions
    // ======================

    // Variabel untuk menyimpan audio oscillator alarm
    let alarmOscillator = null;
    let alarmAudioCtx = null;

    /**
     * Memutar suara alarm beep berulang menggunakan Web Audio API
     */
    function startAlarmSound() {
        try {
            alarmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            alarmOscillator = alarmAudioCtx.createOscillator();
            const gainNode = alarmAudioCtx.createGain();

            alarmOscillator.type = 'sine';
            alarmOscillator.frequency.setValueAtTime(880, alarmAudioCtx.currentTime); // Nada A5

            // Efek beep putus-putus
            gainNode.gain.setValueAtTime(0.3, alarmAudioCtx.currentTime);
            
            alarmOscillator.connect(gainNode);
            gainNode.connect(alarmAudioCtx.destination);

            alarmOscillator.start();
        } catch (e) {
            console.log("Audio Error:", e);
        }
    }

    /**
     * Menghentikan suara alarm
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
     * Format time as HH:MM:SS (Termasuk Detik)
     * 
     * @param {Date} date Date object
     * 
     * @returns {string} Formatted time
     */
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
    }
    
    /**
     * Format date as readable string
     * 
     * @param {Date} date Date object
     * 
     * @returns {string} Formatted date
     */
    function formatDate(date) {
        const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
        return date.toLocaleDateString("en-US", options);
    }
    
    /**
     * Get greeting based on time of day with catchy messages
     * 
     * @param {number} hour Current hour (0-23)
     * 
     * @returns {object} Greeting title & motivational quote
     */
    function getGreetingData(hour) {
        if (hour >= 5 && hour < 12) {
            return {
                greeting: "Good Morning! ☀️",
                quote: "Awali harimu dengan senyuman dan segelas semangat!"
            };
        } else if (hour >= 12 && hour < 17) {
            return {
                greeting: "Good Afternoon! 🌤️",
                quote: "Tetap fokus dan konsisten, kamu bergerak lebih dekat ke tujuanmu!"
            };
        } else if (hour >= 17 && hour < 21) {
            return {
                greeting: "Good Evening! 🌆",
                quote: "Selesaikan tugas hari ini dengan baik, apresiasi usahamu!"
            };
        } else {
            return {
                greeting: "Good Night! 🌙",
                quote: "Waktunya mengistirahatkan pikiran. Esok adalah kesempatan baru!"
            };
        }
    }
    
    /**
     * Update greeting display
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
    // 3.2 Timer State Management
    // ======================
    
    /**
     * Format timer display as MM:SS
     * 
     * @param {number} seconds Total seconds
     * 
     * @returns {string} Formatted timer
     */
    function formatTimerDisplay(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
        const secs = (seconds % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    }
    
    /**
     * Update timer display
     */
    function updateTimerDisplay() {
        const timerDisplay = document.getElementById("timer-display");
        if (timerDisplay) {
            timerDisplay.textContent = formatTimerDisplay(state.timer.remainingSeconds);
        }
    }

    /**
     * Tampilkan Modal Custom untuk Input/Edit Nama Pengguna
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
                <p style="margin-bottom: 1rem; color: #666; font-size: 0.9rem;">Masukkan nama kamu agar dashboard terasa lebih personal!</p>
                
                <div class="modal-input-group" style="margin-bottom: 1rem;">
                    <input type="text" id="modal-user-name" value="${escapeHtml(initialValue)}" placeholder="Nama kamu..." style="text-align: center; font-size: 1rem; font-weight: 600;">
                    <div id="modal-name-error" style="color: #ff6b6b; font-size: 0.85rem; margin-top: 0.5rem; display: none;">⚠️ Nama tidak boleh kosong!</div>
                </div>

                <div class="modal-actions">
                    <button id="save-name-modal" class="btn add" style="width: 100%; padding: 0.7rem;">Simpan Nama</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const nameInput = document.getElementById("modal-user-name");
        const errorEl = document.getElementById("modal-name-error");

        if (nameInput) {
            nameInput.focus();
            nameInput.select();
            
            // Sembunyikan pesan error saat pengguna mulai mengetik ulang
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
                // Tampilkan pesan error langsung di dalam popup modal
                errorEl.style.display = "block";
            }
        };

        document.getElementById("save-name-modal").addEventListener("click", handleSave);
        nameInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleSave();
        });
    }

    /**
     * Tampilkan Modal Custom untuk Tambah Quick Link
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
            <div style="background: #ffffff; padding: 1.8rem; border-radius: 20px; text-align: center; width: 90%; max-width: 380px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 2px solid #ffd166; animation: fadeIn 0.3s ease;">
                <h3 style="font-size: 1.3rem; margin-bottom: 1rem; font-family: var(--font-heading); color: #333;">🔗 Tambah Quick Link</h3>
                
                <div class="modal-input-group">
                    <label for="modal-link-name">Nama Website</label>
                    <input type="text" id="modal-link-name" placeholder="Contoh: Google, GitHub">
                    
                    <label for="modal-link-url">URL Website</label>
                    <input type="text" id="modal-link-url" placeholder="Contoh: google.com">
                </div>

                <div class="modal-actions">
                    <button id="cancel-link-modal" class="btn reset" style="background: #e2e8f0; color: #475569;">Batal</button>
                    <button id="save-link-modal" class="btn add" style="background: #ffd166; color: #78350f;">+ Simpan</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Auto focus ke input nama
        const nameInput = document.getElementById("modal-link-name");
        const urlInput = document.getElementById("modal-link-url");
        if (nameInput) nameInput.focus();

        const closeModal = () => modal.remove();

        document.getElementById("cancel-link-modal").addEventListener("click", closeModal);

        document.getElementById("save-link-modal").addEventListener("click", () => {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            if (name && url) {
                onSave(name, url);
                closeModal();
            } else {
                showError("Nama dan URL tidak boleh kosong!");
            }
        });
    }

    /**
     * Tampilkan Modal Konfirmasi Konfirmasi Hapus Custom
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
                    <button id="cancel-confirm-modal" class="btn reset" style="flex: 1; background: #e2e8f0; color: #475569;">Batal</button>
                    <button id="ok-confirm-modal" class="btn stop" style="flex: 1; background: #ff6b6b; color: white;">Hapus</button>
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
     * Tampilkan Modal Custom agar Audio Loop tetap berjalan tanpa dibekukan browser
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
                <h3 style="font-size: 1.4rem; margin-bottom: 0.8rem; font-family: var(--font-heading); color: #333;">🎉 Focus Session Finish!</h3>
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
    
    /**
     * Start the timer
     */
    function startTimer() {
        if (state.timer.isRunning) return;
        
        state.timer.isRunning = true;
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
                        audio.loop = true; // Suara akan terus memutar berulang-ulang
                        audio.play().catch(e => console.log("Audio play failed:", e));
                    }
                    
                    // Tampilkan modal custom (audio akan terus berputar terus-menerus sampai tombol OK diklik)
                    showTimerModal("Time is up! Istirahat sejenak atau mulai sesi baru.", () => {
                        if (audio) {
                            audio.pause();
                            audio.currentTime = 0;
                            audio.loop = false; // Matikan suara begitu tombol OK diklik
                        }
                    });
                }
            }
        }, 1000);
        
        // Update button states
        updateTimerButtonStates();
    }
    
    /**
     * Stop the timer
     */
    function stopTimer() {
        if (!state.timer.isRunning) return;
        
        clearInterval(state.timer.intervalId);
        state.timer.isRunning = false;
        state.timer.intervalId = null;
        
        // Update button states
        updateTimerButtonStates();
    }
    
    /**
     * Reset the timer
     */
    function resetTimer() {
        stopTimer();
        const minInput = document.getElementById("custom-minutes-input");
        const secInput = document.getElementById("custom-seconds-input");
        
        const minutes = minInput ? parseInt(minInput.value) || 0 : 0;
        const seconds = secInput ? parseInt(secInput.value) || 0 : 0;
        
        state.timer.remainingSeconds = (minutes * 60) + seconds;
        updateTimerDisplay();
        updateTimerButtonStates();
    }
    
    /**
     * Update timer button states
     */
    function updateTimerButtonStates() {
        const startBtn = document.getElementById("start-timer");
        const stopBtn = document.getElementById("stop-timer");
        const resetBtn = document.getElementById("reset-timer");
        
        if (startBtn) startBtn.disabled = state.timer.isRunning;
        if (stopBtn) stopBtn.disabled = !state.timer.isRunning;
        if (resetBtn) resetBtn.disabled = state.timer.isRunning;
    }
    
    // ======================
    // 4.2 Todo Data Model
    // ======================
    
    /**
     * Create a new todo item
     * 
     * @param {string} text Task description
     * 
     * @returns {object} Todo item
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
     * Add a new todo
     * 
     * @param {string} text Task description
     */
    function addTodo(text) {
        if (!validateTodoInput(text)) return;
        
        const todo = createTodo(text);
        state.todos.push(todo);
        saveState();
        renderTodos();
        showSuccess("Task added successfully!");
        
        // Clear input
        const todoInput = document.getElementById("todo-input");
        if (todoInput) todoInput.value = "";
    }
    
    /**
     * Toggle todo completion
     * 
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
     * Delete a todo
     * 
     * @param {string} id Todo ID
     */
    function deleteTodo(id) {
        state.todos = state.todos.filter(t => t.id !== id);
        saveState();
        renderTodos();
    }
    
    /**
     * Render all todos
     */
    function renderTodos() {
        const container = document.getElementById("todo-items");
        if (!container) return;
        
        if (state.todos.length === 0) {
            container.innerHTML = `<div class="todo-empty">
                <p>No tasks yet. Add one above! 📝</p>
            </div>`;
            return;
        }
        
        container.innerHTML = state.todos.map(todo => `
            <div class="todo-item ${todo.completed ? "completed" : ""}">
                <input type="checkbox" class="todo-checkbox" data-id="${todo.id}" ${todo.completed ? "checked" : ""}>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <button class="todo-delete" data-id="${todo.id}" title="Hapus tugas">🗑️</button>
            </div>
        `).join("");
        
        // Event listener untuk checklist completed
        container.querySelectorAll(".todo-checkbox").forEach(checkbox => {
            checkbox.addEventListener("change", (e) => {
                toggleTodo(e.target.dataset.id);
            });
        });
        
        // Event listener untuk tombol hapus (🗑️)
        container.querySelectorAll(".todo-delete").forEach(button => {
            button.addEventListener("click", (e) => {
                const id = e.target.dataset.id;
                showConfirmModal(
                    "Hapus Tugas?",
                    "Apakah kamu yakin ingin menghapus tugas ini?",
                    () => deleteTodo(id)
                );
            });
        });
    }

    // Helper sanitasi teks HTML sederhana
    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        })[m]);
    }
    
    // ======================
    // 5.2 Quick Links Data Model
    // ======================
    
    /**
     * Create a new quick link
     * @param {string} name - Website name
     * @param {string} url - Website URL
     * @returns {object} Quick link
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
     * @param {string} name - Website name
     * @param {string} url - Website URL
     */
    function addQuickLink(name, url) {
        if (!validateLinkInput(name, url)) return;
        
        // Ensure URL has protocol
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        
        const link = createQuickLink(name, url);
        state.quickLinks.push(link);
        saveState();
        renderQuickLinks();
        
        // Notifikasi sukses sekarang akan muncul di kartu Quick Links (di bawah tombol + Add Link)
        showSuccess("Link added successfully!", "add-link");
    }
    
    /**
     * Delete a quick link
     * @param {string} id - Link ID
     */
    function deleteQuickLink(id) {
        state.quickLinks = state.quickLinks.filter(link => link.id !== id);
        saveState();
        renderQuickLinks();
    }
    
    /**
     * Render all quick links
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
        
        container.innerHTML = state.quickLinks.map(link => `
            <div class="link-item" data-id="${link.id}">
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-button">
                    <span>🌐</span>
                    <span class="link-name">${escapeHtml(link.name)}</span>
                </a>
                <button class="link-delete" title="Hapus Link">✖</button>
            </div>
        `).join("");
        
        // Add event listeners for delete buttons
        container.querySelectorAll(".link-delete").forEach((button, index) => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                const linkId = state.quickLinks[index].id;
                showConfirmModal(
                    "Hapus Quick Link?",
                    "Apakah kamu yakin ingin menghapus link ini?",
                    () => deleteQuickLink(linkId)
                );
            });
        });
    }
    
    // ======================
    // 6.1 Data Manager Module
    // ======================
    
    /**
     * Save state to Local Storage
     */
    function saveState() {
        try {
            const data = {
                todos: state.todos,
                quickLinks: state.quickLinks,
                userName: state.userName // save user name
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save to Local Storage:", error);
        }
    }
    
    /**
     * Load state from Local Storage
     */
    function loadState() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                state.todos = data.todos || [];
                state.quickLinks = data.quickLinks || [];
                state.userName = data.userName || "Friend";
            }
        } catch (error) {
            console.error("Failed to load from Local Storage:", error);
        }
    }

    // ======================
    // 4.4 Input Validation and User Feedback
    // ======================

    /**
     * Show error message
     * @param {string} message - Error message
     * @param {string} elementId - Element to highlight (optional)
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
            // Ambil wrapper .todo-input agar notifikasi disisipkan tepat di bawah baris input
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
     * Show success message
     * @param {string} message - Success message
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
            // Ambil wrapper .todo-input agar notifikasi disisipkan tepat di bawah baris input
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
     * Validate todo input
     * @param {string} text - Todo text
     * @returns {boolean} True if valid
     */
    function validateTodoInput(text) {
        if (!text || !text.trim()) {
            showError("Task cannot be empty!", "todo-input");
            return false;
        }
        
        if (text.length > 200) {
            showError("Task is too long (max 200 characters)", "todo-input");
            return false;
        }
        
        return true;
    }

    /**
     * Validate quick link input
     * @param {string} name - Website name
     * @param {string} url - Website URL
     * @returns {boolean} True if valid
     */
    function validateLinkInput(name, url) {
        if (!name || !name.trim()) {
            showError("Website name cannot be empty!");
            return false;
        }
        
        if (!url || !url.trim()) {
            showError("Website URL cannot be empty!");
            return false;
        }
        
        const urlPattern = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]{2,}(\/.*)?$/i;
        if (!urlPattern.test(url) && !url.startsWith("http://") && !url.startsWith("https://")) {
            showError("Please enter a valid URL (e.g., example.com or https://example.com)");
            return false;
        }
        
        return true;
    }
    
    // ======================
    // Event Listeners
    // ======================
    
    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Timer buttons
        const startBtn = document.getElementById("start-timer");
        const stopBtn = document.getElementById("stop-timer");
        const resetBtn = document.getElementById("reset-timer");
        const customTimerInput = document.getElementById("custom-timer-input");
        const minInput = document.getElementById("custom-minutes-input");
        const secInput = document.getElementById("custom-seconds-input");
        const userNameEl = document.getElementById("user-name");
        
        if (userNameEl) {
            userNameEl.addEventListener("click", () => {
                showNameModal("Ubah Nama Kamu", state.userName, (newName) => {
                    state.userName = newName;
                    saveState();
                    updateGreeting();
                    showSuccess("Nama berhasil diperbarui!", "greeting-text");
                });
            });
        }
        
        if (startBtn) startBtn.addEventListener("click", startTimer);
        if (stopBtn) stopBtn.addEventListener("click", stopTimer);
        if (resetBtn) resetBtn.addEventListener("click", resetTimer);

        if (customTimerInput) {
            customTimerInput.addEventListener("change", () => {
                if (!state.timer.isRunning) {
                    resetTimer();
                }
            });
        }

        [minInput, secInput].forEach(input => {
            if (input) {
                // Menambahkan listener 'input' dan 'change' agar perubahan waktu langsung direspons
                ["input", "change"].forEach(eventType => {
                    input.addEventListener(eventType, () => {
                        if (!state.timer.isRunning) {
                            resetTimer();
                        }
                    });
                });
            }
        });
        
        // Todo input with improved validation
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
            
            // Clear validation on input
            todoInput.addEventListener("input", () => {
                todoInput.style.borderColor = "";
                todoInput.style.boxShadow = "";
            });
        }
        
        // Quick links with improved interface
        const addLinkBtn = document.getElementById("add-link");
        if (addLinkBtn) {
            addLinkBtn.addEventListener("click", () => {
                showAddLinkModal((name, url) => {
                    addQuickLink(name, url);
                });
            });
        }
    }

    // Add CSS animation for fadeIn
    const style = document.createElement("style");
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
    
    // ======================
    // Initialization
    // ======================
    
    /**
     * Initialize the application
     */
    function init() {
        // Load saved state
        loadState();

        // Jika nama masih default/kosong saat pertama masuk website, munculkan modal nama
        if (!localStorage.getItem(CONFIG.STORAGE_KEY) || state.userName === "Friend") {
            setTimeout(() => {
                showNameModal("Selamat Datang! 👋", "", (newName) => {
                    state.userName = newName;
                    saveState();
                    updateGreeting();
                });
            }, 400);
        }
        
        // Set up initial displays & reset timer
        updateGreeting();
        resetTimer();
        
        // Render data
        renderTodos();
        renderQuickLinks();
        
        // Set up event listeners
        setupEventListeners();
        
        // Start time updates
        setInterval(updateGreeting, CONFIG.UPDATE_INTERVALS.TIME);
        
        console.log("To-Do List Life Dashboard initialized! 🎉");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();