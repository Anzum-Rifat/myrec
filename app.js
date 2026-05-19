// Date Setup
const dateInput = document.getElementById('currentDate');
const monthSelector = document.getElementById('monthSelector');
const today = new Date();
const todayString = today.toISOString().split('T')[0];
const currentMonthString = todayString.slice(0, 7);

dateInput.value = todayString;
monthSelector.value = currentMonthString;

// Default Data Structure
function getDailyData(date) {
    let data = localStorage.getItem('recovery_' + date);
    if (data) return JSON.parse(data);
    return {
        pocketMoney: 0,
        savings: 0,
        cigarettes: 0,
        cigPrice: 15,
        expenses: [],
        namaz: [],
        namazAlarm: false,
        gambled: 'no',
        gamblingLoss: 0,
        weed: 'no'
    };
}

let currentData = getDailyData(todayString);

// Element References
const pocketMoneyInput = document.getElementById('pocketMoney');
const dailySavingsInput = document.getElementById('dailySavings');
const totalSpentToday = document.getElementById('totalSpentToday');
const currentBalance = document.getElementById('currentBalance');

const cigCountDisplay = document.getElementById('cigCountDisplay');
const cigPriceInput = document.getElementById('cigPrice');
const cigTotalCostDisplay = document.getElementById('cigTotalCostDisplay');

const expenseNote = document.getElementById('expenseNote');
const expenseAmount = document.getElementById('expenseAmount');
const dailyExpenseList = document.getElementById('dailyExpenseList');

const namazCheckboxes = document.querySelectorAll('.namaz-wakt');
const namazAlarmToggle = document.getElementById('namazAlarmToggle');
const gambledSelect = document.getElementById('gambled');
const gamblingLossInput = document.getElementById('gamblingLoss');
const weedSelect = document.getElementById('weedStatus');

// Update UI and Calculations
function calculateFinance() {
    let otherExpenses = currentData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    let cigExpense = currentData.cigarettes * currentData.cigPrice;
    let totalKhoroch = otherExpenses + cigExpense + currentData.gamblingLoss;
    
    let balance = currentData.pocketMoney - totalKhoroch;

    totalSpentToday.innerText = totalKhoroch;
    currentBalance.innerText = balance;
    cigTotalCostDisplay.innerText = cigExpense;
}

function updateUI() {
    pocketMoneyInput.value = currentData.pocketMoney;
    dailySavingsInput.value = currentData.savings;
    cigCountDisplay.innerText = currentData.cigarettes;
    cigPriceInput.value = currentData.cigPrice;
    
    dailyExpenseList.innerHTML = '';
    currentData.expenses.forEach(exp => {
        let li = document.createElement('li');
        li.innerHTML = `<span>${exp.note}</span> <span>${exp.amount} ৳</span>`;
        dailyExpenseList.appendChild(li);
    });

    namazCheckboxes.forEach(cb => { cb.checked = currentData.namaz.includes(cb.value); });
    namazAlarmToggle.checked = currentData.namazAlarm;
    gambledSelect.value = currentData.gambled;
    gamblingLossInput.value = currentData.gamblingLoss;
    weedSelect.value = currentData.weed;

    calculateFinance();
}

function saveData() {
    currentData.pocketMoney = parseFloat(pocketMoneyInput.value) || 0;
    currentData.savings = parseFloat(dailySavingsInput.value) || 0;
    currentData.cigPrice = parseFloat(cigPriceInput.value) || 15;
    currentData.gamblingLoss = parseFloat(gamblingLossInput.value) || 0;
    
    let namazDone = [];
    namazCheckboxes.forEach(cb => { if (cb.checked) namazDone.push(cb.value); });
    currentData.namaz = namazDone;
    currentData.namazAlarm = namazAlarmToggle.checked;
    currentData.gambled = gambledSelect.value;
    currentData.weed = weedSelect.value;

    localStorage.setItem('recovery_' + dateInput.value, JSON.stringify(currentData));
    calculateFinance();
    updateDailySummary();
}

// Event Listeners for Live Update
pocketMoneyInput.addEventListener('input', saveData);
dailySavingsInput.addEventListener('input', saveData);
cigPriceInput.addEventListener('input', saveData);
gamblingLossInput.addEventListener('input', saveData);
gambledSelect.addEventListener('change', saveData);
weedSelect.addEventListener('change', saveData);
namazAlarmToggle.addEventListener('change', saveData);
namazCheckboxes.forEach(cb => cb.addEventListener('change', saveData));

dateInput.addEventListener('change', (e) => {
    currentData = getDailyData(e.target.value);
    updateUI();
    updateDailySummary();
});

// Cigarette Buttons
document.getElementById('addCigBtn').addEventListener('click', () => {
    currentData.cigarettes++;
    saveData();
    updateUI();
});
document.getElementById('removeCigBtn').addEventListener('click', () => {
    if(currentData.cigarettes > 0) currentData.cigarettes--;
    saveData();
    updateUI();
});

// Expense Button
document.getElementById('addExpenseBtn').addEventListener('click', () => {
    if(expenseNote.value === '' || expenseAmount.value === '') return alert('Khoroch er biboron aur taka dao!');
    currentData.expenses.push({ note: expenseNote.value, amount: parseFloat(expenseAmount.value) });
    saveData();
    updateUI();
    expenseNote.value = ''; expenseAmount.value = '';
});

// Final Save Button
document.getElementById('saveDailyRecordBtn').addEventListener('click', () => {
    saveData();
    alert('Ajker final hisab save kora hoyeche!');
});

// Daily Summary
function updateDailySummary() {
    let cigExp = currentData.cigarettes * currentData.cigPrice;
    let text = `
        <strong>Date:</strong> ${dateInput.value} <br>
        <strong>Namaz:</strong> ${currentData.namaz.length > 0 ? currentData.namaz.join(', ') : 'Poro nai!'} <br>
        <strong>Cigarettes:</strong> ${currentData.cigarettes} ta (Khoroch: ${cigExp} ৳) <br>
        <strong>Gambling:</strong> ${currentData.gambled === 'yes' ? `<span style="color:red">Khelecho (Loss: ${currentData.gamblingLoss} ৳)</span>` : `<span style="color:green">Khelo nai!</span>`} <br>
        <strong>Savings today:</strong> ${currentData.savings} ৳
    `;
    document.getElementById('dailySummaryText').innerHTML = text;
}

// Monthly Tabs & Logic
document.getElementById('tabDaily').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('tabMonthly').classList.remove('active');
    document.getElementById('dailySummaryContainer').style.display = 'block';
    document.getElementById('monthlySummaryContainer').style.display = 'none';
});

document.getElementById('tabMonthly').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('tabDaily').classList.remove('active');
    document.getElementById('dailySummaryContainer').style.display = 'none';
    document.getElementById('monthlySummaryContainer').style.display = 'block';
    calcMonthlyStats(monthSelector.value);
});

monthSelector.addEventListener('change', (e) => calcMonthlyStats(e.target.value));

function calcMonthlyStats(monthStr) {
    let totCig = 0, totCigExp = 0, totLoss = 0, totExp = 0, totSav = 0, gDays = 0;
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (key.startsWith('recovery_' + monthStr)) {
            let d = JSON.parse(localStorage.getItem(key));
            totCig += d.cigarettes || 0;
            totCigExp += (d.cigarettes * d.cigPrice) || 0;
            totLoss += d.gamblingLoss || 0;
            totSav += d.savings || 0;
            if (d.gambled === 'yes') gDays++;
            totExp += d.expenses.reduce((s, e) => s + e.amount, 0);
        }
    }
    document.getElementById('monthlyCig').innerText = totCig;
    document.getElementById('monthlyCigExpense').innerText = totCigExp;
    document.getElementById('monthlyGamblingLoss').innerText = totLoss;
    document.getElementById('monthlyTotalExpense').innerText = totExp;
    document.getElementById('monthlySavings').innerText = totSav;
    document.getElementById('monthlyGamblingDays').innerText = gDays;
}

// Automatic Namaz Alarm for Bangladesh (Dhaka Time)
const adhanAudio = document.getElementById('adhanAudio');
let prayerTimes = {};

async function fetchPrayerTimes() {
    try {
        let res = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Dhaka&country=Bangladesh&method=1');
        let data = await res.json();
        prayerTimes = data.data.timings;
    } catch(err) { console.log('Prayer API error', err); }
}

function checkAlarm() {
    if(!namazAlarmToggle.checked) return;
    
    let now = new Date();
    let timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    // Check if current time matches any prayer time
    if(timeStr === prayerTimes.Fajr || timeStr === prayerTimes.Dhuhr || 
       timeStr === prayerTimes.Asr || timeStr === prayerTimes.Maghrib || timeStr === prayerTimes.Isha) {
        adhanAudio.play();
    }
}

fetchPrayerTimes();
setInterval(checkAlarm, 60000); // Check every minute

// Init app
updateUI();
updateDailySummary();

// PWA Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}
