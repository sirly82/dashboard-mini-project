# To-Do List Life Dashboard ✨

A modern, responsive, and feature-rich daily dashboard built with Vanilla JavaScript. Designed to help users stay productive through smart task management, an immersive full-screen Pomodoro focus timer, and quick navigation shortcuts—all saved locally in the browser.

---

## 🌟 Features

### 🕒 1. Dynamic Clock & Personalized Greeting
* **Live Clock & Date:** Real-time clock displaying `HH:MM:SS` along with full weekday and date formatting.
* **Contextual Greetings & Quotes:** Time-based greetings (Morning, Afternoon, Evening, Night) paired with inspirational quote subtexts.
* **Custom User Name:** Interactive modal prompt on first visit or upon clicking the username to set and save a personalized display name.

### ⏱️ 2. Pomodoro Focus Timer & Zen Focus Overlay
* **Flexible Durations:** Custom minute/second inputs alongside one-click duration presets (`25m Focus`, `5m Break`, `15m Long Break`).
* **Full-Screen Focus Overlay:** Immersive distraction-free overlay mode with real-time progress display.
* **Pause / Resume State:** Seamlessly pause and resume sessions directly inside the focus overlay without closing it.
* **Audio Alerts:** Loud repeating audio alert upon session completion, using HTML5 Audio with Web Audio API fallbacks.

### 📝 3. Interactive To-Do List
* **Task Management:** Add, complete (toggle checkbox), edit, and delete tasks.
* **Dual Task Editing:** Edit task text via custom modal by clicking the Edit button (✏️) or double-clicking the task label.
* **Duplicate Task Prevention:** Rejects identical task entries (case-insensitive) with instant error feedback.
* **Multi-Criteria Task Sorting:** Sort tasks dynamically by **Newest**, **Oldest**, **Status (Uncompleted First)**, or **Alphabetical**.
* **Progress Counter:** Live header stat badge displaying completion progress (e.g., `(2/5)`).

### 🌐 4. Quick Website Links
* **Favicon Fetching:** Automatically fetches and displays real website favicons using the Google Favicon API.
* **Link Editing & Deletion:** Hover control buttons to edit names/URLs via custom modal or delete quick links.
* **Protocol Auto-Formatting:** Automatically prepends `https://` to user input if missing.

### 🎨 5. Themes, Keyboard Shortcuts & UX
* **Light / Dark Mode:** Instant theme switching (`☀️/🌙`) backed by CSS variables and local storage persistence.
* **Keyboard Shortcuts:** 
  * `Esc`: Instantly close active modals or exit Full-Screen Focus Mode.
  * `Space`: Toggle Pause/Resume while inside Full-Screen Focus Mode.
* **Custom UI Modals:** Replaced native browser `alert()` and `prompt()` dialogs with custom, animated popups (`fadeIn`).

---

## 🏆 Coding Camp Challenges (5/5 Completed)

- [x] **Light / Dark Mode:** Full theme switcher with persistent settings.
- [x] **Custom Name in Greeting:** Personalized greeting with editable name modal.
- [x] **Change Pomodoro Time:** Custom duration input fields and quick preset buttons.
- [x] **Prevent Duplicate Tasks:** Active check preventing duplicate task entries.
- [x] **Sort Tasks:** Dropdown selector to organize tasks by multiple criteria.

---

## 🛠️ Technical Stack & Architecture

* **Markup:** HTML5 (Semantic Structure)
* **Styling:** CSS3 (Custom Properties, Flexbox, CSS Grid, Transitions & Animations)
* **Scripting:** Vanilla JavaScript (ES6+, IIFE Encapsulation, Event Delegation)
* **Storage:** Browser `localStorage` API for client-side persistence
* **External APIs:** Google Favicon API for website icon rendering

---

## 📁 Repository Structure

```text
.
├── index.html          # Main HTML structure
├── css/
│   └── style.css       # Unified stylesheet (Single CSS file constraint)
├── js/
│   └── app.js          # Main application logic (Single JS file constraint)
└── README.md           # Project documentation
```

---

## ⌨️ Keyboard Shortcuts Guide

| Key | Context | Action |
| :--- | :--- | :--- |
| `Space` | Focus Overlay | Pause / Resume countdown timer |
| `Esc` | Focus Overlay / Modals | Exit focus mode or close active modal popup |
| `Enter` | Modal Input Fields | Confirm and save modal entry |

---

## 🚀 How to Run

1. Clone or download this repository.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).
3. All user data, custom preferences, tasks, and quick links will automatically save to your browser's local storage.