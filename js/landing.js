/* =========================================================
   FocusForge - landing.js
   Landing-page-only interactions. Never loaded on the app
   pages (dashboard/tasks/habits/stats), and does not touch
   any task/habit/pomodoro/stats logic or data — those live
   entirely in app.js and are untouched by this file.
   ========================================================= */

const THEME_KEY = "focusforge_darkMode";

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* =========================================================
   THEME TOGGLE
   Reads/writes the SAME localStorage key app.js uses, so the
   preference stays consistent across the landing page and
   the application pages.
   ========================================================= */
function initTheme() {
    const toggleBtn = document.getElementById("themeToggle");
    const isDark = localStorage.getItem(THEME_KEY) === "true";

    if (isDark) {
        document.body.classList.add("dark");
    }
    if (toggleBtn) {
        toggleBtn.setAttribute("aria-pressed", String(isDark));
        toggleBtn.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    }

    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
        const nowDark = document.body.classList.toggle("dark");
        localStorage.setItem(THEME_KEY, String(nowDark));
        toggleBtn.setAttribute("aria-pressed", String(nowDark));
        toggleBtn.setAttribute("aria-label", nowDark ? "Switch to light theme" : "Switch to dark theme");
    });
}

/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */
function initMobileNav() {
    const toggleBtn = document.getElementById("mobileNavToggle");
    const mobileNav = document.getElementById("mobileNav");
    if (!toggleBtn || !mobileNav) return;

    function openMenu() {
        mobileNav.hidden = false;
        // Set the data-open attribute on the next frame so the
        // "hidden -> visible" transition has something to animate from.
        requestAnimationFrame(() => mobileNav.setAttribute("data-open", "true"));
        toggleBtn.setAttribute("aria-expanded", "true");
        toggleBtn.setAttribute("aria-label", "Close menu");
        document.body.style.overflow = "hidden";
    }

    function closeMenu() {
        mobileNav.removeAttribute("data-open");
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.setAttribute("aria-label", "Open menu");
        document.body.style.overflow = "";
        // Wait for the close transition before hiding from the
        // accessibility tree, unless the user prefers less motion.
        const delay = prefersReducedMotion() ? 0 : 200;
        window.setTimeout(() => {
            if (toggleBtn.getAttribute("aria-expanded") === "false") {
                mobileNav.hidden = true;
            }
        }, delay);
    }

    toggleBtn.addEventListener("click", () => {
        const isOpen = toggleBtn.getAttribute("aria-expanded") === "true";
        isOpen ? closeMenu() : openMenu();
    });

    mobileNav.querySelectorAll(".mobile-nav-link").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    mobileNav.querySelectorAll("[data-open-modal]").forEach((btn) => {
        btn.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && toggleBtn.getAttribute("aria-expanded") === "true") {
            closeMenu();
            toggleBtn.focus();
        }
    });
}

/* =========================================================
   SCROLL REVEAL
   Uses IntersectionObserver. Skips animation entirely for
   users who prefer reduced motion — content is just visible.
   ========================================================= */
function initScrollReveal() {
    const revealEls = document.querySelectorAll(".reveal");
    if (!revealEls.length) return;

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
        revealEls.forEach((el) => el.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    revealEls.forEach((el) => observer.observe(el));
}

/* =========================================================
   MODAL SYSTEM (Login / Sign Up)
   Handles opening, closing, switching between modals, Escape
   to close, focus management, and a simple focus trap.
   ========================================================= */
function initModals() {
    const overlay = document.getElementById("modalOverlay");
    const modals = Array.from(document.querySelectorAll(".modal"));
    if (!overlay || !modals.length) return;

    let activeModal = null;
    let lastFocusedElement = null;

    function getFocusable(modal) {
        return Array.from(
            modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => el.offsetParent !== null);
    }

    function openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;

        if (activeModal) {
            closeModal({ skipFocusReturn: true });
        }

        lastFocusedElement = document.activeElement;
        overlay.hidden = false;
        modal.hidden = false;
        activeModal = modal;
        document.body.style.overflow = "hidden";

        const focusable = getFocusable(modal);
        if (focusable.length) {
            focusable[0].focus();
        }
    }

    function closeModal(options) {
        const opts = options || {};
        if (!activeModal) return;

        activeModal.hidden = true;
        overlay.hidden = true;
        document.body.style.overflow = "";
        activeModal = null;

        if (!opts.skipFocusReturn && lastFocusedElement) {
            lastFocusedElement.focus();
        }
    }

    // Open triggers (nav, hero, final CTA, mobile nav)
    document.querySelectorAll("[data-open-modal]").forEach((btn) => {
        btn.addEventListener("click", () => openModal(btn.dataset.openModal));
    });

    // Close buttons
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
        btn.addEventListener("click", () => closeModal());
    });

    // Clicking the overlay closes the active modal
    overlay.addEventListener("click", () => closeModal());

    // Switch between Login <-> Sign Up
    document.querySelectorAll("[data-switch-modal]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.switchModal;
            closeModal({ skipFocusReturn: true });
            openModal(targetId);
        });
    });

    // Escape closes, Tab traps focus within the open modal
    document.addEventListener("keydown", (e) => {
        if (!activeModal) return;

        if (e.key === "Escape") {
            closeModal();
            return;
        }

        if (e.key === "Tab") {
            const focusable = getFocusable(activeModal);
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
}

/* =========================================================
   FORM VALIDATION (frontend-only prototype)
   No data is sent anywhere. Successful validation shows a
   message clarifying this is a prototype, not a real login
   or account creation.
   ========================================================= */
function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setFieldError(input, errorEl, message) {
    const field = input.closest(".form-field");
    if (message) {
        field.classList.add("has-error");
        errorEl.textContent = message;
    } else {
        field.classList.remove("has-error");
        errorEl.textContent = "";
    }
}

function initLoginForm() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const email = document.getElementById("loginEmail");
    const password = document.getElementById("loginPassword");
    const emailError = document.getElementById("loginEmailError");
    const passwordError = document.getElementById("loginPasswordError");
    const success = document.getElementById("loginSuccess");

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        let valid = true;

        if (!email.value.trim()) {
            setFieldError(email, emailError, "Email is required.");
            valid = false;
        } else if (!isValidEmail(email.value.trim())) {
            setFieldError(email, emailError, "Enter a valid email address.");
            valid = false;
        } else {
            setFieldError(email, emailError, "");
        }

        if (!password.value) {
            setFieldError(password, passwordError, "Password is required.");
            valid = false;
        } else {
            setFieldError(password, passwordError, "");
        }

        success.hidden = !valid;

        // Frontend-only prototype: no data is submitted anywhere and no
        // real authentication happens. On successful validation we simply
        // redirect the user into the existing dashboard.html page after a
        // short delay so the success message is visible first.
        if (valid) {
            window.setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 400);
        }
    });

    // Clear a field's error as soon as the user starts fixing it.
    [email, password].forEach((input) => {
        input.addEventListener("input", () => {
            success.hidden = true;
        });
    });
}

function initSignupForm() {
    const form = document.getElementById("signupForm");
    if (!form) return;

    const name = document.getElementById("signupName");
    const email = document.getElementById("signupEmail");
    const password = document.getElementById("signupPassword");
    const confirmPassword = document.getElementById("signupConfirmPassword");

    const nameError = document.getElementById("signupNameError");
    const emailError = document.getElementById("signupEmailError");
    const passwordError = document.getElementById("signupPasswordError");
    const confirmError = document.getElementById("signupConfirmPasswordError");
    const success = document.getElementById("signupSuccess");

    const MIN_PASSWORD_LENGTH = 8;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        let valid = true;

        if (!name.value.trim()) {
            setFieldError(name, nameError, "Name is required.");
            valid = false;
        } else {
            setFieldError(name, nameError, "");
        }

        if (!email.value.trim()) {
            setFieldError(email, emailError, "Email is required.");
            valid = false;
        } else if (!isValidEmail(email.value.trim())) {
            setFieldError(email, emailError, "Enter a valid email address.");
            valid = false;
        } else {
            setFieldError(email, emailError, "");
        }

        if (!password.value) {
            setFieldError(password, passwordError, "Password is required.");
            valid = false;
        } else if (password.value.length < MIN_PASSWORD_LENGTH) {
            setFieldError(password, passwordError, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            valid = false;
        } else {
            setFieldError(password, passwordError, "");
        }

        if (!confirmPassword.value) {
            setFieldError(confirmPassword, confirmError, "Please confirm your password.");
            valid = false;
        } else if (confirmPassword.value !== password.value) {
            setFieldError(confirmPassword, confirmError, "Passwords do not match.");
            valid = false;
        } else {
            setFieldError(confirmPassword, confirmError, "");
        }

        success.hidden = !valid;

        // Frontend-only prototype: no account is created and no
        // password is ever stored in localStorage or sent anywhere.
    });

    [name, email, password, confirmPassword].forEach((input) => {
        input.addEventListener("input", () => {
            success.hidden = true;
        });
    });
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initMobileNav();
    initScrollReveal();
    initModals();
    initLoginForm();
    initSignupForm();
});
