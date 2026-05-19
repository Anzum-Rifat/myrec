// --- ১. তারিখ এবং বেসিক সেটআপ ---
const dateInput = document.getElementById('currentDate');
const monthSelector = document.getElementById('monthSelector');

// আজকের তারিখ অটোমেটিক সেট করা
const today = new Date();
const todayString = today.toISOString().split('T')[0];
const currentMonthString = todayString.slice(0, 7);

dateInput.value = todayString;
monthSelector.value = currentMonthString;

// --- ২. ডাটা সেভ এবং লোড করার ফাংশন (LocalStorage) ---
function getDailyData(date) {
    let data = localStorage.getItem('recovery_' + date);
    if (data) {
        return JSON.parse(data);
    } else {
        // নতুন দিনের জন্য ফাকা ডাটাবেস
        return {
            cigarettes: 0,
            expenses: [],
            namaz: [],
            namazAlarm: false,
            gambled: 'no',
            gamblingLoss: 0,
            weed: 'no'
        };
    }
}

function saveDailyData(date, data) {
    localStorage.setItem('recovery_' + date, JSON.stringify(data));
    updateDailySummary(date);
}

let currentData = getDailyData(todayString);

// --- ৩. সিগারেট কাউন্টার লজিক ---
const cigCountDisplay = document.getElementById('cigCountDisplay');

function updateCigDisplay() {
    cigCountDisplay.innerText = currentData.cigarettes;
}

document.getElementById('addCigBtn').addEventListener('click', () => {
    currentData.cigarettes += 1;
    saveDailyData(dateInput.value, currentData);
    updateCigDisplay();
});

document.getElementById('removeCigBtn').addEventListener('click', () => {
    if (currentData.cigarettes > 0) {
        currentData.cigarettes -= 1;
        saveDailyData(dateInput.value, currentData);
        updateCigDisplay();
    }
});

// --- ৪. খরচের হিসাব (Quick Add) ---
const expenseNote = document.getElementById('expenseNote');
const expenseAmount = document.getElementById('expenseAmount');
const dailyExpenseList = document.getElementById('dailyExpenseList');

function renderExpenses() {
    dailyExpenseList.innerHTML = '';
    currentData.expenses.forEach((exp, index) => {
        let li = document.createElement('li');
        li.innerHTML = `<span>${exp.note}</span> <span>${exp.amount} ৳</span>`;
        dailyExpenseList.appendChild(li);
    });
}

document.getElementById('addExpenseBtn').addEventListener('click', () => {
    if (expenseNote.value === '' || expenseAmount.value === '') {
        alert('খরচের কারণ এবং টাকার পরিমাণ দুটোই লিখতে হবে!');
        return;
    }
    
    currentData.expenses.push({
        note: expenseNote.value,
        amount: parseInt(expenseAmount.value)
    });
    
    saveDailyData(dateInput.value, currentData);
    renderExpenses();
    
    expenseNote.value = '';
    expenseAmount.value = '';
});

// --- ৫. সারাদিনের চূড়ান্ত হিসাব সেভ করা (জুয়া, নেশা, নামাজ) ---
const namazCheckboxes = document.querySelectorAll('.namaz-wakt');
const namazAlarmToggle = document.getElementById('namazAlarmToggle');
const gambledSelect = document.getElementById('gambled');
const gamblingLossInput = document.getElementById('gamblingLoss');
const weedSelect = document.getElementById('weedStatus');

document.getElementById('saveDailyRecordBtn').addEventListener('click', () => {
    // নামাজের ডাটা নেওয়া
    let namazDone = [];
    namazCheckboxes.forEach(cb => {
        if (cb.checked) namazDone.push(cb.value);
    });
    
    currentData.namaz = namazDone;
    currentData.namazAlarm = namazAlarmToggle.checked;
    currentData.gambled = gambledSelect.value;
    currentData.gamblingLoss = parseInt(gamblingLossInput.value) || 0;
    currentData.weed = weedSelect.value;
    
    saveDailyData(dateInput.value, currentData);
    alert('তোর আজকের চূড়ান্ত হিসাব সফলভাবে সেভ হয়েছে! সাব্বাস, লড়াই চালিয়ে যা!');
});

// --- ৬. ডাটা লোড করে স্ক্রিনে দেখানো (যখন তারিখ বদলাবি) ---
function loadDataToScreen(date) {
    currentData = getDailyData(date);
    
    updateCigDisplay();
    renderExpenses();
    
    // চেকবক্স ও সিলেক্ট বক্স আপডেট
    namazCheckboxes.forEach(cb => {
        cb.checked = currentData.namaz.includes(cb.value);
    });
    namazAlarmToggle.checked = currentData.namazAlarm;
    gambledSelect.value = currentData.gambled;
    gamblingLossInput.value = currentData.gamblingLoss;
    weedSelect.value = currentData.weed;
    
    updateDailySummary(date);
}

dateInput.addEventListener('change', (e) => {
    loadDataToScreen(e.target.value);
});

// --- ৭. ডেইলি সামারি আপডেট ---
function updateDailySummary(date) {
    let data = getDailyData(date);
    let totalExpense = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    let summaryHTML = `
        <strong>তারিখ:</strong> ${date} <br>
        <strong>নামাজ:</strong> ${data.namaz.length > 0 ? data.namaz.join(', ') : 'এক ওয়াক্তও পড়িসনি!'} <br>
        <strong>সিগারেট:</strong> ${data.cigarettes} টা <br>
        <strong>অন্যান্য খরচ:</strong> ${totalExpense} ৳ <br>
        <strong>জুয়া:</strong> ${data.gambled === 'yes' ? `<span style="color:red">খেলেছিস (লস: ${data.gamblingLoss} ৳) 😞</span>` : `<span style="color:green">খেলিসনি! আলহামদুলিল্লাহ! 🛡️</span>`} <br>
        <strong>মদ/গাঁজা:</strong> ${data.weed === 'yes' ? 'খেয়েছিস ❌' : 'খাসনি ✅'}
    `;
    
    document.getElementById('dailySummaryText').innerHTML = summaryHTML;
}

// --- ৮. ট্যাব সিস্টেম ও মান্থলি রিপোর্ট ---
const tabDaily = document.getElementById('tabDaily');
const tabMonthly = document.getElementById('tabMonthly');
const dailySummaryContainer = document.getElementById('dailySummaryContainer');
const monthlySummaryContainer = document.getElementById('monthlySummaryContainer');

tabDaily.addEventListener('click', () => {
    tabDaily.classList.add('active');
    tabMonthly.classList.remove('active');
    dailySummaryContainer.style.display = 'block';
    monthlySummaryContainer.style.display = 'none';
});

tabMonthly.addEventListener('click', () => {
    tabMonthly.classList.add('active');
    tabDaily.classList.remove('active');
    dailySummaryContainer.style.display = 'none';
    monthlySummaryContainer.style.display = 'block';
    calculateMonthlyStats(monthSelector.value);
});

monthSelector.addEventListener('change', (e) => {
    calculateMonthlyStats(e.target.value);
});

function calculateMonthlyStats(monthStr) { // monthStr format: "YYYY-MM"
    let totalCigs = 0;
    let totalGamblingLoss = 0;
    let totalExpense = 0;
    let gamblingDays = 0;

    // পুরো স্টোরেজ ঘুরে এই মাসের ডাটা বের করা
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (key.startsWith('recovery_' + monthStr)) {
            let dailyData = JSON.parse(localStorage.getItem(key));
            
            totalCigs += dailyData.cigarettes || 0;
            totalGamblingLoss += dailyData.gamblingLoss || 0;
            if (dailyData.gambled === 'yes') gamblingDays++;
            
            let dailyExp = dailyData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            totalExpense += dailyExp;
        }
    }

    document.getElementById('monthlyCig').innerText = totalCigs;
    document.getElementById('monthlyGamblingLoss').innerText = totalGamblingLoss;
    document.getElementById('monthlyTotalExpense').innerText = totalExpense;
    document.getElementById('monthlyGamblingDays').innerText = gamblingDays;
}

// অ্যাপ চালু হওয়ার সাথে সাথে আজকের ডাটা লোড করা
loadDataToScreen(todayString);
// Service Worker Registration (For Offline PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.log('Service Worker Failed!', err));
    });
}