// --- ফায়ারবেস লিংক (এখানে তোর আসল লিংক দিবি, শেষে স্লাশ '/' রাখবি না) ---
const FIREBASE_URL = "https://তোর-ডাটাবেস-লিংক.firebaseio.com"; 

const dateInput = document.getElementById('currentDate');
const summaryDateSelector = document.getElementById('summaryDateSelector');
const monthSelector = document.getElementById('monthSelector');
const today = new Date();
const todayString = today.toISOString().split('T')[0];
const currentMonthString = todayString.slice(0, 7);

dateInput.value = todayString;
summaryDateSelector.value = todayString;
monthSelector.value = currentMonthString;

let currentData = getDefaultData();

// গ্লোবাল ডাটা (টার্গেট সেভিংস এবং ধারদেনা)
let targetGoal = JSON.parse(localStorage.getItem('recovery_goal')) || { name: '', target: 0 };
let debts = JSON.parse(localStorage.getItem('recovery_debts')) || [];

function getDefaultData() {
    return {
        basePocketMoney: 0, addedMoney: 0, savings: 0,
        cigarettes: 0, cigPrice: 15, expenses: [], namaz: [],
        namazAlarm: false, gambled: 'no', gamblingLoss: 0,
        weed: 'no', studyMinutes: 0, closingBalance: 0
    };
}

// ফায়ারবেস থেকে ডাটা সিঙ্ক করার ফাংশন
async function syncWithFirebase(dateStr) {
    if (FIREBASE_URL.includes("তোর-ডাটাবেস")) {
        // ফায়ারবেস না থাকলে লোকাল ডাটা লোড করবে
        let localData = localStorage.getItem('recovery_' + dateStr);
        if (localData) currentData = JSON.parse(localData);
        else currentData = getDefaultData();
        updateUI(); generateDailySummary(dateStr);
        return;
    }

    try {
        let res = await fetch(FIREBASE_URL + `/recovery/${dateStr}.json`);
        let data = await res.json();
        if (data) {
            currentData = data;
            localStorage.setItem('recovery_' + dateStr, JSON.stringify(data)); // অফলাইনের জন্য সেভ
        } else {
            let localData = localStorage.getItem('recovery_' + dateStr);
            currentData = localData ? JSON.parse(localData) : getDefaultData();
        }
    } catch(e) {
        let localData = localStorage.getItem('recovery_' + dateStr);
        currentData = localData ? JSON.parse(localData) : getDefaultData();
    }
    
    updateUI(); generateDailySummary(dateStr);
}

// ইলিমেন্ট রেফারেন্স
const addedMoneyInput = document.getElementById('addedMoney');
const dailySavingsInput = document.getElementById('dailySavings');
const cigCountDisplay = document.getElementById('cigCountDisplay');
const cigPriceInput = document.getElementById('cigPrice');
const namazCheckboxes = document.querySelectorAll('.namaz-wakt');
const namazAlarmToggle = document.getElementById('namazAlarmToggle');
const gambledSelect = document.getElementById('gambled');
const gamblingLossInput = document.getElementById('gamblingLoss');
const weedSelect = document.getElementById('weedStatus');

// ফিন্যান্স ক্যালকুলেশন
function calculateFinance() {
    let otherExpenses = currentData.expenses ? currentData.expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;
    let cigExpense = currentData.cigarettes * currentData.cigPrice;
    let totalKhoroch = otherExpenses + cigExpense + currentData.gamblingLoss;
    
    let totalAvailable = currentData.basePocketMoney + currentData.addedMoney;
    let balance = totalAvailable - (totalKhoroch + currentData.savings);
    currentData.closingBalance = balance;

    document.getElementById('carryOverBalance').innerText = currentData.basePocketMoney;
    document.getElementById('totalSpentToday').innerText = totalKhoroch; 
    document.getElementById('currentBalance').innerText = balance;
    document.getElementById('cigTotalCostDisplay').innerText = cigExpense;
}

function updateUI() {
    addedMoneyInput.value = currentData.addedMoney;
    dailySavingsInput.value = currentData.savings;
    cigCountDisplay.innerText = currentData.cigarettes;
    cigPriceInput.value = currentData.cigPrice;
    document.getElementById('totalStudyDisplay').innerText = currentData.studyMinutes;
    
    document.getElementById('dailyExpenseList').innerHTML = '';
    if (currentData.expenses) {
        currentData.expenses.forEach(exp => {
            let li = document.createElement('li');
            li.innerHTML = `<span>${exp.note}</span> <strong>${exp.amount} ৳</strong>`;
            document.getElementById('dailyExpenseList').appendChild(li);
        });
    }

    namazCheckboxes.forEach(cb => { cb.checked = currentData.namaz ? currentData.namaz.includes(cb.value) : false; });
    namazAlarmToggle.checked = currentData.namazAlarm;
    gambledSelect.value = currentData.gambled;
    gamblingLossInput.value = currentData.gamblingLoss;
    weedSelect.value = currentData.weed;

    calculateFinance(); updateGoalUI(); renderDebts();
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

    calculateFinance();
    localStorage.setItem('recovery_' + dateInput.value, JSON.stringify(currentData));
    
    // ফায়ারবেসে পুশ করা
    if (!FIREBASE_URL.includes("তোর-ডাটাবেস")) {
        fetch(FIREBASE_URL + `/recovery/${dateInput.value}.json`, {
            method: 'PUT', body: JSON.stringify(currentData)
        });
    }

    updateGoalUI(); generateDailySummary(summaryDateSelector.value);
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
    summaryDateSelector.value = e.target.value; 
    syncWithFirebase(e.target.value);
});

// সিগারেট ও খরচ
document.getElementById('addCigBtn').addEventListener('click', () => { currentData.cigarettes++; saveData(); updateUI(); });
document.getElementById('removeCigBtn').addEventListener('click', () => { if(currentData.cigarettes > 0) currentData.cigarettes--; saveData(); updateUI(); });
document.getElementById('addExpenseBtn').addEventListener('click', () => {
    let note = document.getElementById('expenseNote').value;
    let amt = document.getElementById('expenseAmount').value;
    if(note && amt) {
        if(!currentData.expenses) currentData.expenses = [];
        currentData.expenses.push({ note: note, amount: parseFloat(amt) });
        saveData(); updateUI();
        document.getElementById('expenseNote').value = ''; document.getElementById('expenseAmount').value = '';
    }
});

document.getElementById('saveDailyRecordBtn').addEventListener('click', () => { saveData(); alert('হিসাব ফায়ারবেসে সেভ হয়েছে!'); });

// নির্দিষ্ট দিনের সামারি
function generateDailySummary(dateStr) {
    let cigExp = currentData.cigarettes * currentData.cigPrice;
    let otherExpenses = currentData.expenses ? currentData.expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;
    let totalKhoroch = otherExpenses + cigExp + (currentData.gamblingLoss || 0);
    
    let text = `
        <p><strong>তারিখ:</strong> <span>${dateStr}</span></p>
        <p><strong>নামাজ:</strong> <span>${currentData.namaz && currentData.namaz.length > 0 ? currentData.namaz.join(', ') : 'পড়া হয়নি! ❌'}</span></p>
        <p><strong>পড়াশোনা:</strong> <span>${currentData.studyMinutes} মিনিট</span></p>
        <p><strong>সিগারেট:</strong> <span>${currentData.cigarettes} টি (খরচ: ${cigExp} ৳)</span></p>
        <p><strong>আজকের মোট খরচ:</strong> <span class="text-danger"><strong>${totalKhoroch} ৳</strong></span></p>
        <p><strong>অবশিষ্ট পকেট মানি:</strong> <span class="text-success"><strong>${currentData.closingBalance || 0} ৳</strong></span></p>
        <p><strong>জুয়া:</strong> <span>${currentData.gambled === 'yes' ? `<strong style="color:red">লস: ${currentData.gamblingLoss} ৳ 😞</strong>` : `<strong style="color:green">খেলেননি ✅</strong>`}</span></p>
        <p><strong>সেভিংস:</strong> <span style="color:#00b894; font-weight:bold;">${currentData.savings} ৳</span></p>
    `;
    document.getElementById('dailySummaryText').innerHTML = text;
}
summaryDateSelector.addEventListener('change', (e) => { generateDailySummary(e.target.value); });

// রিপোর্ট ট্যাব লজিক
document.getElementById('tabDaily').addEventListener('click', function() {
    this.classList.add('active'); document.getElementById('tabMonthly').classList.remove('active');
    document.getElementById('dailySummaryContainer').style.display = 'block'; document.getElementById('monthlySummaryContainer').style.display = 'none';
});
document.getElementById('tabMonthly').addEventListener('click', function() {
    this.classList.add('active'); document.getElementById('tabDaily').classList.remove('active');
    document.getElementById('dailySummaryContainer').style.display = 'none'; document.getElementById('monthlySummaryContainer').style.display = 'block';
    calcMonthlyStats(monthSelector.value);
});

async function calcMonthlyStats(monthStr) {
    let tCig = 0, tCigExp = 0, tLoss = 0, tExp = 0, tSav = 0, gDays = 0, tStudy = 0;
    
    if (!FIREBASE_URL.includes("তোর-ডাটাবেস")) {
        try {
            let res = await fetch(FIREBASE_URL + `/recovery.json`);
            let allData = await res.json();
            if(allData) {
                for (let key in allData) {
                    if (key.startsWith(monthStr)) {
                        let d = allData[key];
                        tCig += d.cigarettes || 0; tCigExp += (d.cigarettes * (d.cigPrice || 15)) || 0;
                        tLoss += d.gamblingLoss || 0; tSav += d.savings || 0; tStudy += d.studyMinutes || 0;
                        if (d.gambled === 'yes') gDays++;
                        tExp += d.expenses ? d.expenses.reduce((s, e) => s + e.amount, 0) : 0;
                    }
                }
            }
        } catch(e) { console.log(e); }
    }
    
    document.getElementById('monthlyCig').innerText = tCig; document.getElementById('monthlyCigExpense').innerText = tCigExp;
    document.getElementById('monthlyGamblingLoss').innerText = tLoss; document.getElementById('monthlyTotalExpense').innerText = tExp;
    document.getElementById('monthlySavings').innerText = tSav; document.getElementById('monthlyGamblingDays').innerText = gDays;
    document.getElementById('monthlyStudy').innerText = tStudy;
}
monthSelector.addEventListener('change', (e) => calcMonthlyStats(e.target.value));

// টার্গেট সেভিংস এবং ধারদেনার বাকি ফাংশনগুলো আগের মতোই থাকবে
function updateGoalUI() { /* আগের কোড */ }
document.getElementById('setGoalBtn').addEventListener('click', () => { /* আগের কোড */ });
function renderDebts() { /* আগের কোড */ }
window.toggleDebt = (index) => { debts[index].paid = !debts[index].paid; saveDebts(); };
window.deleteDebt = (index) => { debts.splice(index, 1); saveDebts(); };
function saveDebts() { localStorage.setItem('recovery_debts', JSON.stringify(debts)); renderDebts(); }
document.getElementById('addDebtBtn').addEventListener('click', () => { /* আগের কোড */ });

// পোমোডোরো টাইমার লজিক
let timerInterval; let timeRemaining = 0; let isTimerRunning = false; let currentSessionMinutes = 0;
const studyAudio = document.getElementById('studyAlarmAudio');
function updateTimerDisplay() {
    document.getElementById('minutesDisplay').innerText = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    document.getElementById('secondsDisplay').innerText = (timeRemaining % 60).toString().padStart(2, '0');
}
document.getElementById('startTimerBtn').addEventListener('click', () => {
    if (isTimerRunning) return;
    let mins = parseInt(document.getElementById('customStudyTime').value);
    currentSessionMinutes = mins; timeRemaining = mins * 60; isTimerRunning = true; updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeRemaining--; updateTimerDisplay();
        if (timeRemaining <= 0) {
            clearInterval(timerInterval); isTimerRunning = false;
            currentData.studyMinutes += currentSessionMinutes; saveData(); updateUI();
            playAlarm(studyAudio, '⏰ পড়া শেষ! ব্রেক নিন।');
        }
    }, 1000);
});
document.getElementById('stopTimerBtn').addEventListener('click', () => { clearInterval(timerInterval); isTimerRunning = false; timeRemaining = 0; updateTimerDisplay(); });

// অ্যালার্ম মডাল এবং অটো নামাজ অ্যালার্ম
const alarmModal = document.getElementById('alarmModal');
const alarmTitle = document.getElementById('alarmTitle');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
let currentPlayingAudio = null;
function playAlarm(audioElement, titleText) { alarmTitle.innerText = titleText; alarmModal.style.display = 'flex'; currentPlayingAudio = audioElement; currentPlayingAudio.play(); }
stopAlarmBtn.addEventListener('click', () => { if(currentPlayingAudio) { currentPlayingAudio.pause(); currentPlayingAudio.currentTime = 0; } alarmModal.style.display = 'none'; });

// ইনিশিয়াল লোড
syncWithFirebase(todayString);
