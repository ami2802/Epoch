const DEFAULTS = {
    birthDate: '',
    customMessage: '',
    hideHeader: false,
    tipDismissed: false,
    settingsTipDismissed: false,
    ageFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    messageFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    decimals: 8,
    colors: {
        bg: '#202020',
        age: '#ffffff',
        label: '#666666',
        message: '#999999'
    }
};

const PRESETS = {
    dark: {
        bg: '#202020',
        age: '#ffffff',
        label: '#666666',
        message: '#999999',
        border: 'rgba(255, 255, 255, 0.1)'
    },
    light: {
        bg: '#f4f1ea',
        age: '#2c2921',
        label: '#8c887d',
        message: '#6b675d',
        border: 'rgba(0, 0, 0, 0.1)'
    }
};

let birthDate = null;
let intervalId = null;

const setupView = document.getElementById('setup-view');
const onboardingView = document.getElementById('onboarding-view');
const onboardingMessageView = document.getElementById('onboarding-message-view');
const counterView = document.getElementById('counter-view');
const birthDateInput = document.getElementById('birth-date-input');
const onboardingBirthDateInput = document.getElementById('onboarding-birth-date-input');
const onboardingContinueBtn = document.getElementById('onboarding-continue-btn');
const onboardingMessageInput = document.getElementById('onboarding-message-input');
const onboardingMessageContinueBtn = document.getElementById('onboarding-message-continue-btn');
const customMessageInput = document.getElementById('custom-quote-input');
const hideHeaderInput = document.getElementById('hide-age-label');
const ageLabelDisplay = document.getElementById('age-label');

const tipPopup = document.getElementById('tip-popup');
const closeTipBtn = document.getElementById('close-tip');
const settingsTip = document.getElementById('settings-tip');
const closeSettingsTipBtn = document.getElementById('close-settings-tip');

const colorBg = document.getElementById('color-bg');
const colorAge = document.getElementById('color-age');
const colorLabel = document.getElementById('color-label');
const colorMessage = document.getElementById('color-quote');

const hexBg = document.getElementById('hex-bg');
const hexAge = document.getElementById('hex-age');
const hexLabel = document.getElementById('hex-label');
const hexMessage = document.getElementById('hex-quote');

const presetDark = document.getElementById('preset-dark');
const presetLight = document.getElementById('preset-light');

const saveBtn = document.getElementById('save-btn');
const settingsBtn = document.getElementById('settings-btn');

const ageDisplay = document.getElementById('age');
const messageDisplay = document.getElementById('message-display');
const decimalInput = document.getElementById('decimal-input');
const decimalValue = document.getElementById('decimal-value');
const resetDefaultsBtn = document.getElementById('reset-defaults');

// Generic Custom Select Logic
class CustomSelect {
    constructor(containerId, hiddenSelectId, onSelect) {
        this.container = document.getElementById(containerId);
        this.hiddenSelect = document.getElementById(hiddenSelectId);
        this.trigger = this.container.querySelector('.select-trigger');
        this.options = this.container.querySelectorAll('.option');
        this.currentText = this.container.querySelector('.current-font');
        this.onSelect = onSelect;

        this.init();
    }

    init() {
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other selects first
            document.querySelectorAll('.custom-select').forEach(cs => {
                if (cs !== this.container) cs.classList.remove('active');
            });
            this.container.classList.toggle('active');
        });

        this.options.forEach(opt => {
            opt.addEventListener('click', () => {
                const val = opt.dataset.value;
                this.update(val);
                this.container.classList.remove('active');
                if (this.onSelect) this.onSelect(val);
            });
        });

        document.addEventListener('click', () => {
            this.container.classList.remove('active');
        });
    }

    update(val) {
        const option = Array.from(this.options).find(o => o.dataset.value === val);
        if (option) {
            this.currentText.innerText = option.innerText.trim();
            this.currentText.style.fontFamily = val;
            this.options.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            this.hiddenSelect.value = val;
        }
    }
}

// Global scope selectors
let ageFontSelector, messageFontSelector;

chrome.storage.sync.get(['birthDate', 'customMessage', 'hideHeader', 'tipDismissed', 'ageFont', 'messageFont', 'decimals', 'colors'], (result) => {
    let colors = result.colors;
    if (!colors) {
        const isSystemLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        colors = isSystemLight ? { ...PRESETS.light } : { ...PRESETS.dark };
    }
    colors = { ...DEFAULTS.colors, ...colors };

    // Init Font Selectors first so they are available for update
    ageFontSelector = new CustomSelect('font-select-age', 'font-select', (val) => {
        applyFont('--age-font', val);
    });

    messageFontSelector = new CustomSelect('font-select-message-custom', 'message-font-select', (val) => {
        applyFont('--message-font', val);
    });

    applyTheme(colors);
    
    const message = result.customMessage || DEFAULTS.customMessage;
    customMessageInput.value = message;
    
    const hideHeaderState = result.hideHeader !== undefined ? result.hideHeader : DEFAULTS.hideHeader;
    hideHeaderInput.checked = hideHeaderState;
    toggleAgeLabel(!hideHeaderState);

    const ageFont = result.ageFont || DEFAULTS.ageFont;
    ageFontSelector.update(ageFont);
    applyFont('--age-font', ageFont);

    const messageFont = result.messageFont || DEFAULTS.messageFont;
    messageFontSelector.update(messageFont);
    applyFont('--message-font', messageFont);

    const isTipDismissed = result.tipDismissed !== undefined ? result.tipDismissed : DEFAULTS.tipDismissed;
    const isSettingsTipDismissed = result.settingsTipDismissed !== undefined ? result.settingsTipDismissed : DEFAULTS.settingsTipDismissed;
    const decimals = result.decimals !== undefined ? result.decimals : DEFAULTS.decimals;

    if (decimalInput) {
        decimalInput.value = decimals;
        if (decimalValue) decimalValue.innerText = decimals;
    }
    
    if (result.birthDate) {
        birthDateInput.value = result.birthDate;
        onboardingBirthDateInput.value = result.birthDate;
        parseAndSetBirthDate(result.birthDate);
        showCounter({ 
            customMessage: message,
            hideHeader: hideHeaderState,
            decimals: decimals
        });
        showTips(isTipDismissed, isSettingsTipDismissed);
    } else {
        showOnboarding();
    }
});

function showTips(footerDismissed, settingsDismissed) {
    setTimeout(() => {
        if (!footerDismissed && tipPopup) tipPopup.classList.remove('hidden');
        if (!settingsDismissed && settingsTip) settingsTip.classList.remove('hidden');
    }, 1000);
}

function toggleAgeLabel(visible) {
    if (visible && ageLabelDisplay) {
        ageLabelDisplay.classList.remove('hidden');
    } else if (ageLabelDisplay) {
        ageLabelDisplay.classList.add('hidden');
    }
}

function applyFont(variable, font) {
    document.documentElement.style.setProperty(variable, font);
}

function applyTheme(colors) {
    document.documentElement.style.setProperty('--bg-color', colors.bg);
    document.documentElement.style.setProperty('--age-color', colors.age);
    document.documentElement.style.setProperty('--label-color', colors.label);
    document.documentElement.style.setProperty('--message-color', colors.message);
    
    const isLightMode = isLight(colors.bg);
    const border = colors.border || (isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)');
    document.documentElement.style.setProperty('--glass-border', border);
    document.documentElement.style.setProperty('color-scheme', isLightMode ? 'light' : 'dark');
    
    document.body.classList.toggle('light-mode', isLightMode);
    document.body.classList.toggle('dark-mode', !isLightMode);

    syncUI(colors);
}

function isLight(color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
}

function syncUI(colors) {
    if (colorBg) colorBg.value = colors.bg;
    if (colorAge) colorAge.value = colors.age;
    if (colorLabel) colorLabel.value = colors.label;
    if (colorMessage) colorMessage.value = colors.message;
    
    if (hexBg) hexBg.value = colors.bg;
    if (hexAge) hexAge.value = colors.age;
    if (hexLabel) hexLabel.value = colors.label;
    if (hexMessage) hexMessage.value = colors.message;
}

function parseAndSetBirthDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    birthDate = new Date(year, month - 1, day, 0, 0, 0);
}

function showSetup() {
    stopCounter();
    onboardingView.classList.add('hidden');
    setupView.classList.remove('hidden');
    counterView.classList.add('hidden');
    if (!birthDateInput.value) {
        birthDateInput.value = `2000-12-31`;
    }
}

function showOnboarding() {
    stopCounter();
    onboardingView.classList.remove('hidden');
    onboardingMessageView.classList.add('hidden');
    setupView.classList.add('hidden');
    counterView.classList.add('hidden');
}

function showOnboardingMessage() {
    stopCounter();
    onboardingView.classList.add('hidden');
    onboardingMessageView.classList.remove('hidden');
    setupView.classList.add('hidden');
    counterView.classList.add('hidden');
}

function showCounter(settings = {}) {
    onboardingView.classList.add('hidden');
    onboardingMessageView.classList.add('hidden');
    setupView.classList.add('hidden');
    counterView.classList.remove('hidden');
    
    const message = settings.customMessage || customMessageInput.value;
    if (messageDisplay) {
        if (!message) {
            messageDisplay.classList.add('hidden');
        } else {
            messageDisplay.classList.remove('hidden');
            messageDisplay.innerText = message;
        }
    }
    const decimals = settings.decimals !== undefined ? settings.decimals : (decimalInput ? parseInt(decimalInput.value) : DEFAULTS.decimals);
    startCounter(decimals);
}

function startCounter(decimals = 8) {
    if (intervalId) clearInterval(intervalId);
    function update() {
        if (!birthDate || isNaN(birthDate.getTime())) return;
        const now = new Date();
        const birthMonth = birthDate.getMonth();
        const birthDay = birthDate.getDate();
        const birthYear = birthDate.getFullYear();
        const currentYear = now.getFullYear();
        let lastBirthday = new Date(currentYear, birthMonth, birthDay);
        if (now < lastBirthday) {
            lastBirthday = new Date(currentYear - 1, birthMonth, birthDay);
        }
        let nextBirthday = new Date(lastBirthday.getFullYear() + 1, birthMonth, birthDay);
        const yearsPassed = lastBirthday.getFullYear() - birthYear;
        const msSinceLastBirthday = now - lastBirthday;
        const msBetweenBirthdays = nextBirthday - lastBirthday;
        const age = yearsPassed + (msSinceLastBirthday / msBetweenBirthdays);
        ageDisplay.innerText = age.toFixed(decimals);
    }
    update();
    intervalId = setInterval(update, 50);
}

function stopCounter() {
    if (intervalId) clearInterval(intervalId);
}

// Color Sync Listeners
[
    [colorBg, hexBg, 'bg'],
    [colorAge, hexAge, 'age'],
    [colorLabel, hexLabel, 'label'],
    [colorMessage, hexMessage, 'message']
].forEach(([picker, hex, key]) => {
    if (!picker || !hex) return;
    picker.addEventListener('input', () => {
        hex.value = picker.value;
        applyTheme({
            bg: colorBg.value,
            age: colorAge.value,
            label: colorLabel.value,
            message: colorMessage.value
        });
    });
    hex.addEventListener('input', () => {
        let val = hex.value;
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            picker.value = val;
            applyTheme({
                bg: colorBg.value,
                age: colorAge.value,
                label: colorLabel.value,
                message: colorMessage.value
            });
        }
    });
});

presetDark.addEventListener('click', () => applyTheme(PRESETS.dark));
presetLight.addEventListener('click', () => applyTheme(PRESETS.light));

saveBtn.addEventListener('click', () => {
    const val = birthDateInput.value;
    if (val) {
        const settings = {
            birthDate: val,
            customMessage: customMessageInput.value,
            hideHeader: hideHeaderInput.checked,
            ageFont: document.getElementById('font-select').value,
            messageFont: document.getElementById('message-font-select').value,
            decimals: Math.min(Math.max(parseInt(decimalInput.value) || 0, 0), 10),
            colors: {
                bg: colorBg.value,
                age: colorAge.value,
                label: colorLabel.value,
                message: colorMessage.value
            }
        };
        chrome.storage.sync.set(settings, () => {
            parseAndSetBirthDate(val);
            showCounter(settings);
        });
    }
});

hideHeaderInput.addEventListener('change', () => toggleAgeLabel(!hideHeaderInput.checked));

if (closeTipBtn) {
    closeTipBtn.addEventListener('click', () => {
        tipPopup.classList.add('hidden');
        chrome.storage.sync.set({ tipDismissed: true });
    });
}

if (closeSettingsTipBtn) {
    closeSettingsTipBtn.addEventListener('click', () => {
        if (settingsTip) settingsTip.classList.add('hidden');
        chrome.storage.sync.set({ settingsTipDismissed: true });
    });
}

if (decimalInput && decimalValue) {
    decimalInput.addEventListener('input', () => {
        decimalValue.innerText = decimalInput.value;
    });
}

if (resetDefaultsBtn) {
    resetDefaultsBtn.addEventListener('click', () => {
        hideHeaderInput.checked = DEFAULTS.hideHeader;
        decimalInput.value = DEFAULTS.decimals;
        if (decimalValue) decimalValue.innerText = DEFAULTS.decimals;
        
        applyTheme(PRESETS.dark);
        ageFontSelector.update(DEFAULTS.ageFont);
        messageFontSelector.update(DEFAULTS.messageFont);
        applyFont('--age-font', DEFAULTS.ageFont);
        applyFont('--message-font', DEFAULTS.messageFont);
        toggleAgeLabel(!DEFAULTS.hideHeader);
    });
}

settingsBtn.addEventListener('click', showSetup);

onboardingContinueBtn.addEventListener('click', () => {
    const val = onboardingBirthDateInput.value;
    if (val) {
        birthDateInput.value = val;
        showOnboardingMessage();
    }
});

onboardingMessageContinueBtn.addEventListener('click', () => {
    const val = birthDateInput.value;
    const messageVal = onboardingMessageInput.value;
    
    // Sync the main inputs
    customMessageInput.value = messageVal;

    const settings = {
        birthDate: val,
        customMessage: messageVal,
        hideHeader: hideHeaderInput.checked,
        ageFont: document.getElementById('font-select').value || DEFAULTS.ageFont,
        messageFont: document.getElementById('message-font-select').value || DEFAULTS.messageFont,
        decimals: Math.min(Math.max(parseInt(decimalInput.value) || 0, 0), 10),
        colors: {
            bg: colorBg.value,
            age: colorAge.value,
            label: colorLabel.value,
            message: colorMessage.value
        }
    };
    chrome.storage.sync.set(settings, () => {
        parseAndSetBirthDate(val);
        showCounter(settings);
        
        // Show tips only after full onboarding continues
        chrome.storage.sync.get(['tipDismissed', 'settingsTipDismissed'], (res) => {
            showTips(res.tipDismissed || false, res.settingsTipDismissed || false);
        });
    });
});
