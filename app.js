const dateInput = document.getElementById('currentDate');
const monthSelector = document.getElementById('monthSelector');
const today = new Date();
const todayString = today.toISOString().split('T')[0];
const currentMonthString = todayString.slice(0, 7);

dateInput.value = todayString;
monthSelector.value = currentMonthString;

// আগের দিনের অবশিষ্ট ব্যালেন্স খুঁজে বের করার ফাংশন
function getPreviousBalance(currentDateStr) {
    let maxDate = "0000-00-00";
    let lastBalance = 0;
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (key.startsWith('recovery_')) {
            let dStr = key.replace('recovery_', '');
            if (dStr < currentDateStr && dStr > maxDate) {
                maxDate = dStr;
                let pastData = JSON.parse(localStorage.getItem(key));
                lastBalance = pastData.closingBalance || 0;
            }
        }
    }
    return lastBalance;
}

// ডিফল্ট ডাটা স্ট্রাকচার
function getDailyData(date) {
    let data = localStorage.getItem('recovery_' + date);
    if (data) return JSON.parse(data);
    
    // নতুন দিনের ক্ষেত্রে আগের দিনের ব্যালেন্স নিয়ে আসবে
    let carryOver = getPreviousBalance(date);
    return {
        basePocketMoney: carryOver,
        addedMoney: 0,
        savings: 0,
        cigarettes: 0,
        cigPrice: 15,
        expenses: [],
        namaz: [],
        namazAlarm: false,
        gambled: 'no',
        gamblingLoss: 0,
        weed: 'no',
        studyMinutes: 0,
        closingBalance: carryOver
    };
}

let currentData = getDailyData(todayString);

// ইলিমেন্ট রেফারেন্স
const carryOverBalance = document.getElementById('carryOverBalance');
const addedMoneyInput = document.getElementById('addedMoney');
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
const totalStudyDisplay = document.getElementById('totalStudyDisplay');

// ফিন্যান্স ক্যালকুলেশন
function calculateFinance() {
    let otherExpenses = currentData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    let cigExpense = currentData.cigarettes * currentData.cigPrice;
    let totalKhoroch = otherExpenses + cigExpense + currentData.gamblingLoss + currentData.savings;
    
    let totalAvailable = currentData.basePocketMoney + currentData.addedMoney;
    let balance = totalAvailable - totalKhoroch;
    
    currentData.closingBalance = balance;

    carryOverBalance.innerText = currentData.basePocketMoney;
    totalSpentToday.innerText = totalKhoroch - currentData.savings; // খরচে সেভিংস দেখাবো না
    currentBalance.innerText = balance;
    cigTotalCostDisplay.innerText = cigExpense;
}

function updateUI() {
    addedMoneyInput.value = currentData.addedMoney;
    dailySavingsInput.value = currentData.savings;
    cigCountDisplay.innerText = currentData.cigarettes;
    cigPriceInput.value = currentData.cigPrice;
    totalStudyDisplay.innerText = currentData.studyMinutes;
    
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
    currentData.addedMoney = parseFloat(addedMoneyInput.value) || 0;
    currentData.savings = parseFloat(dailySavingsInput.value) || 0;
    currentData.cigPrice = parseFloat(cigPriceInput.value) || 15;
    currentData.gamblingLoss = parseFloat(gamblingLossInput.value) || 0;
    
    let namazDone = [];
    namazCheckboxes.forEach(cb => { if (cb.checked) namazDone.push(cb.value); });
    currentData.namaz = namazDone;
    currentData.namazAlarm = namazAlarmToggle.checked;
    currentData.gambled = gambledSelect.value;
    currentData.weed = weedSelect.value;

    calculateFinance(); // closingBalance আপডেট করার জন্য
    localStorage.setItem('recovery_' + dateInput.value, JSON.stringify(currentData));
    updateDailySummary();
}

// ইভেন্ট লিসেনার
addedMoneyInput.addEventListener('input', saveData);
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

// সিগারেট বাটন
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

// খরচ যোগ করা
document.getElementById('addExpenseBtn').addEventListener('click', () => {
    if(expenseNote.value === '' || expenseAmount.value === '') return alert('খরচের বিবরণ এবং টাকার পরিমাণ দিন!');
    currentData.expenses.push({ note: expenseNote.value, amount: parseFloat(expenseAmount.value) });
    saveData();
    updateUI();
    expenseNote.value = ''; expenseAmount.value = '';
});

// চূড়ান্ত সেভ
document.getElementById('saveDailyRecordBtn').addEventListener('click', () => {
    saveData();
    alert('আজকের চূড়ান্ত হিসাব সফলভাবে সংরক্ষিত হয়েছে!');
});

// ডেইলি সামারি
function updateDailySummary() {
    let cigExp = currentData.cigarettes * currentData.cigPrice;
    let text = `
        <strong>তারিখ:</strong> ${dateInput.value} <br>
        <strong>নামাজ:</strong> ${currentData.namaz.length > 0 ? currentData.namaz.join(', ') : 'এক ওয়াক্তও পড়া হয়নি!'} <br>
        <strong>পড়াশোনা:</strong> ${currentData.studyMinutes} মিনিট <br>
        <strong>সিগারেট:</strong> ${currentData.cigarettes} টি (খরচ: ${cigExp} ৳) <br>
        <strong>জুয়া:</strong> ${currentData.gambled === 'yes' ? `<span style="color:red">খেলেছেন (লস: ${currentData.gamblingLoss} ৳)</span>` : `<span style="color:green">খেলেননি! আলহামদুলিল্লাহ!</span>`} <br>
        <strong>আজকের সেভিংস:</strong> ${currentData.savings} ৳
    `;
    document.getElementById('dailySummaryText').innerHTML = text;
}

// রিপোর্ট ট্যাব লজিক
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
    let totCig = 0, totCigExp = 0, totLoss = 0, totExp = 0, totSav = 0, gDays = 0, totStudy = 0;
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (key.startsWith('recovery_' + monthStr)) {
            let d = JSON.parse(localStorage.getItem(key));
            totCig += d.cigarettes || 0;
            totCigExp += (d.cigarettes * (d.cigPrice || 15)) || 0;
            totLoss += d.gamblingLoss || 0;
            totSav += d.savings || 0;
            totStudy += d.studyMinutes || 0;
            if (d.gambled === 'yes') gDays++;
            totExp += d.expenses ? d.expenses.reduce((s, e) => s + e.amount, 0) : 0;
        }
    }
    document.getElementById('monthlyCig').innerText = totCig;
    document.getElementById('monthlyCigExpense').innerText = totCigExp;
    document.getElementById('monthlyGamblingLoss').innerText = totLoss;
    document.getElementById('monthlyTotalExpense').innerText = totExp;
    document.getElementById('monthlySavings').innerText = totSav;
    document.getElementById('monthlyGamblingDays').innerText = gDays;
    document.getElementById('monthlyStudy').innerText = totStudy;
}

// ==========================================
// পোমোডোরো টাইমার লজিক
// ==========================================
let timerInterval;
let timeRemaining = 0;
let isTimerRunning = false;
let currentSessionMinutes = 0;

const minutesDisplay = document.getElementById('minutesDisplay');
const secondsDisplay = document.getElementById('secondsDisplay');
const customStudyTime = document.getElementById('customStudyTime');
const studyAlarmAudio = document.getElementById('studyAlarmAudio');

function updateTimerDisplay() {
    let m = Math.floor(timeRemaining / 60);
    let s = timeRemaining % 60;
    minutesDisplay.innerText = m.toString().padStart(2, '0');
    secondsDisplay.innerText = s.toString().padStart(2, '0');
}

document.getElementById('startTimerBtn').addEventListener('click', () => {
    if (isTimerRunning) return;
    let mins = parseInt(customStudyTime.value);
    if (isNaN(mins) || mins <= 0) return alert('সঠিক সময় নির্ধারণ করুন!');
    
    currentSessionMinutes = mins;
    timeRemaining = mins * 60;
    isTimerRunning = true;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            isTimerRunning = false;
            studyAlarmAudio.play();
            alert('টাইমার শেষ! দারুণ পড়াশোনা হয়েছে।');
            
            // মোট স্টাডি টাইমে যোগ করা
            currentData.studyMinutes += currentSessionMinutes;
            saveData();
            updateUI();
        }
    }, 1000);
});

document.getElementById('stopTimerBtn').addEventListener('click', () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timeRemaining = 0;
    updateTimerDisplay();
});

// ==========================================
// অটোমেটিক নামাজের অ্যালার্ম (বাংলাদেশ সময়)
// ==========================================
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
    
    if(timeStr === prayerTimes.Fajr || timeStr === prayerTimes.Dhuhr || 
       timeStr === prayerTimes.Asr || timeStr === prayerTimes.Maghrib || timeStr === prayerTimes.Isha) {
        adhanAudio.play();
        alert('নামাজের সময় হয়েছে!');
    }
}

fetchPrayerTimes();
setInterval(checkAlarm, 60000); // প্রতি মিনিটে চেক করবে

// অ্যাপ চালু হওয়া
updateUI();
updateDailySummary();
