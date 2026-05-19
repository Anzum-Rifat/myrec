const FIREBASE_URL = "https://myrecoveryapp-a6d50-default-rtdb.firebaseio.com"; 

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
let targetGoal = JSON.parse(localStorage.getItem('recovery_goal')) || { name: '', target: 0 };
let debts = []; 
let lastSyncString = ""; // ডাটা ওভাররাইট ঠেকানোর স্পেশাল ভেরিয়েবল

function getDefaultData() {
    return {
        basePocketMoney: 0, addedMoney: 0, savings: 0,
        cigarettes: 0, cigPrice: 15, expenses: [], namaz: [],
        namazAlarm: false, gambled: 'no', gamblingLoss: 0,
        weed: 'no', studyMinutes: 0, closingBalance: 0, debts: []
    };
}

// ফায়ারবেস থেকে ডাটা আনা (ব্যাকগ্রাউন্ডে চলবে)
async function syncWithFirebase(dateStr) {
    try {
        let res = await fetch(FIREBASE_URL + `/recovery/${dateStr}.json`);
        let data = await res.json();
        
        if (data) {
            let newDataString = JSON.stringify(data);
            // যদি ফায়ারবেসের ডাটা আর ওয়েবসাইটের ডাটা আলাদা হয়, তবেই ওয়েবসাইট আপডেট হবে
            if (newDataString !== lastSyncString) {
                currentData = data;
                lastSyncString = newDataString;
                updateUI(); 
                generateDailySummary(dateStr);
            }
        }
    } catch(e) {
        console.error("Firebase Sync Error", e);
    }
}

// প্রতি ৩ সেকেন্ডে ডাটাবেস চেক করবে (টেলিগ্রামে দিলে এখানে অটো আসবে)
setInterval(() => {
    if(document.visibilityState === 'visible') {
        syncWithFirebase(dateInput.value);
    }
}, 3000);

const addedMoneyInput = document.getElementById('addedMoney');
const dailySavingsInput = document.getElementById('dailySavings');
const cigCountDisplay = document.getElementById('cigCountDisplay');
const cigPriceInput = document.getElementById('cigPrice');
const namazCheckboxes = document.querySelectorAll('.namaz-wakt');
const namazAlarmToggle = document.getElementById('namazAlarmToggle');
const gambledSelect = document.getElementById('gambled');
const gamblingLossInput = document.getElementById('gamblingLoss');
const weedSelect = document.getElementById('weedStatus');

function calculateFinance() {
    let otherExpenses = currentData.expenses ? currentData.expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;
    let cigExpense = (currentData.cigarettes || 0) * (currentData.cigPrice || 15);
    let totalKhoroch = otherExpenses + cigExpense + (currentData.gamblingLoss || 0);
    
    let totalAvailable = (currentData.basePocketMoney || 0) + (currentData.addedMoney || 0);
    let balance = totalAvailable - (totalKhoroch + (currentData.savings || 0));
    currentData.closingBalance = balance;

    document.getElementById('carryOverBalance').innerText = currentData.basePocketMoney || 0;
    document.getElementById('totalSpentToday').innerText = totalKhoroch; 
    document.getElementById('currentBalance').innerText = balance;
    document.getElementById('cigTotalCostDisplay').innerText = cigExpense;
}

function updateUI() {
    addedMoneyInput.value = currentData.addedMoney || 0;
    dailySavingsInput.value = currentData.savings || 0;
    cigCountDisplay.innerText = currentData.cigarettes || 0;
    cigPriceInput.value = currentData.cigPrice || 15;
    document.getElementById('totalStudyDisplay').innerText = currentData.studyMinutes || 0;
    
    document.getElementById('dailyExpenseList').innerHTML = '';
    if (currentData.expenses) {
        currentData.expenses.forEach(exp => {
            let li = document.createElement('li');
            li.innerHTML = `<span>${exp.note}</span> <strong>${exp.amount} ৳</strong>`;
            document.getElementById('dailyExpenseList').appendChild(li);
        });
    }

    namazCheckboxes.forEach(cb => { cb.checked = currentData.namaz ? currentData.namaz.includes(cb.value) : false; });
    namazAlarmToggle.checked = currentData.namazAlarm || false;
    gambledSelect.value = currentData.gambled || 'no';
    gamblingLossInput.value = currentData.gamblingLoss || 0;
    weedSelect.value = currentData.weed || 'no';

    debts = currentData.debts || [];
    renderDebts();
    calculateFinance(); 
    updateGoalUI(); 
}

function pushToFirebase() {
    calculateFinance();
    let dataToPush = JSON.stringify(currentData);
    lastSyncString = dataToPush; // নিজে সেভ করার সময় ওভাররাইট লুপ ঠেকানো
    
    fetch(FIREBASE_URL + `/recovery/${dateInput.value}.json`, {
        method: 'PUT', 
        body: dataToPush
    });
    generateDailySummary(summaryDateSelector.value);
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
    currentData.debts = debts;

    pushToFirebase();
}

addedMoneyInput.addEventListener('change', saveData);
dailySavingsInput.addEventListener('change', saveData);
cigPriceInput.addEventListener('change', saveData);
gamblingLossInput.addEventListener('change', saveData);
gambledSelect.addEventListener('change', saveData);
weedSelect.addEventListener('change', saveData);
namazAlarmToggle.addEventListener('change', saveData);
namazCheckboxes.forEach(cb => cb.addEventListener('change', saveData));

dateInput.addEventListener('change', (e) => {
    summaryDateSelector.value = e.target.value; 
    syncWithFirebase(e.target.value);
});

document.getElementById('addCigBtn').addEventListener('click', () => { currentData.cigarettes = (currentData.cigarettes || 0) + 1; pushToFirebase(); updateUI(); });
document.getElementById('removeCigBtn').addEventListener('click', () => { if(currentData.cigarettes > 0) currentData.cigarettes--; pushToFirebase(); updateUI(); });
document.getElementById('addExpenseBtn').addEventListener('click', () => {
    let note = document.getElementById('expenseNote').value;
    let amt = document.getElementById('expenseAmount').value;
    if(note && amt) {
        if(!currentData.expenses) currentData.expenses = [];
        currentData.expenses.push({ note: note, amount: parseFloat(amt) });
        pushToFirebase(); updateUI();
        document.getElementById('expenseNote').value = ''; document.getElementById('expenseAmount').value = '';
    }
});
document.getElementById('saveDailyRecordBtn').addEventListener('click', () => { pushToFirebase(); alert('হিসাব চূড়ান্তভাবে ফায়ারবেসে সেভ হয়েছে!'); });

// নির্দিষ্ট দিনের সামারি
function generateDailySummary(dateStr) {
    let cigExp = (currentData.cigarettes || 0) * (currentData.cigPrice || 15);
    let otherExpenses = currentData.expenses ? currentData.expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;
    let totalKhoroch = otherExpenses + cigExp + (currentData.gamblingLoss || 0);
    
    let text = `
        <p><strong>তারিখ:</strong> <span>${dateStr}</span></p>
        <p><strong>নামাজ:</strong> <span>${currentData.namaz && currentData.namaz.length > 0 ? currentData.namaz.join(', ') : 'পড়া হয়নি! ❌'}</span></p>
        <p><strong>পড়াশোনা:</strong> <span>${currentData.studyMinutes || 0} মিনিট</span></p>
        <p><strong>সিগারেট:</strong> <span>${currentData.cigarettes || 0} টি (খরচ: ${cigExp} ৳)</span></p>
        <p><strong>আজকের মোট খরচ:</strong> <span class="text-danger"><strong>${totalKhoroch} ৳</strong></span></p>
        <p><strong>অবশিষ্ট পকেট মানি:</strong> <span class="text-success"><strong>${currentData.closingBalance || 0} ৳</strong></span></p>
        <p><strong>জুয়া:</strong> <span>${currentData.gambled === 'yes' ? `<strong style="color:red">লস: ${currentData.gamblingLoss} ৳ 😞</strong>` : `<strong style="color:green">খেলেননি ✅</strong>`}</span></p>
        <p><strong>সেভিংস:</strong> <span style="color:#00b894; font-weight:bold;">${currentData.savings || 0} ৳</span></p>
    `;
    document.getElementById('dailySummaryText').innerHTML = text;
}
summaryDateSelector.addEventListener('change', (e) => { generateDailySummary(e.target.value); });

// রিপোর্ট ট্যাব
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
    } catch(e) {}
    
    document.getElementById('monthlyCig').innerText = tCig; document.getElementById('monthlyCigExpense').innerText = tCigExp;
    document.getElementById('monthlyGamblingLoss').innerText = tLoss; document.getElementById('monthlyTotalExpense').innerText = tExp;
    document.getElementById('monthlySavings').innerText = tSav; document.getElementById('monthlyGamblingDays').innerText = gDays;
    document.getElementById('monthlyStudy').innerText = tStudy;
}
monthSelector.addEventListener('change', (e) => calcMonthlyStats(e.target.value));

function updateGoalUI() { /* আগের মতই */ }
document.getElementById('setGoalBtn').addEventListener('click', () => { /* আগের মতই */ });

function renderDebts() {
    const list = document.getElementById('debtList'); list.innerHTML = '';
    debts.forEach((debt, index) => {
        let li = document.createElement('li');
        let typeClass = debt.type === 'owe_them' ? 'debt-owe' : 'debt-get';
        let typeText = debt.type === 'owe_them' ? 'সে পাবে' : 'আমি পাব';
        if(debt.paid) li.classList.add('debt-done');
        li.innerHTML = `<div><strong>${debt.person}</strong>: ${debt.amount} ৳ <br><span class="debt-badge ${typeClass}">${typeText}</span></div>
                        <div><button onclick="toggleDebt(${index})" style="background:#0984e3; padding:6px 10px; font-size:12px;">${debt.paid ? 'আন-পেইড' : 'শোধ হয়েছে'}</button>
                        <button onclick="deleteDebt(${index})" style="background:#d63031; padding:6px 10px; font-size:12px;">X</button></div>`;
        list.appendChild(li);
    });
}
window.toggleDebt = (index) => { debts[index].paid = !debts[index].paid; pushToFirebase(); };
window.deleteDebt = (index) => { debts.splice(index, 1); pushToFirebase(); };
document.getElementById('addDebtBtn').addEventListener('click', () => {
    let person = document.getElementById('debtPerson').value; let amt = parseFloat(document.getElementById('debtAmount').value); let type = document.getElementById('debtType').value;
    if(person && amt) { debts.push({ person, amount: amt, type, paid: false }); pushToFirebase(); document.getElementById('debtPerson').value = ''; document.getElementById('debtAmount').value = ''; }
});

// টাইমার ও অ্যালার্ম লজিক (আগের মতই)
let timerInterval; let timeRemaining = 0; let isTimerRunning = false; let currentSessionMinutes = 0;
const studyAudio = document.getElementById('studyAlarmAudio');
function updateTimerDisplay() { document.getElementById('minutesDisplay').innerText = Math.floor(timeRemaining / 60).toString().padStart(2, '0'); document.getElementById('secondsDisplay').innerText = (timeRemaining % 60).toString().padStart(2, '0'); }
document.getElementById('startTimerBtn').addEventListener('click', () => {
    if (isTimerRunning) return; let mins = parseInt(document.getElementById('customStudyTime').value); currentSessionMinutes = mins; timeRemaining = mins * 60; isTimerRunning = true; updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeRemaining--; updateTimerDisplay();
        if (timeRemaining <= 0) { clearInterval(timerInterval); isTimerRunning = false; currentData.studyMinutes = (currentData.studyMinutes || 0) + currentSessionMinutes; pushToFirebase(); updateUI(); playAlarm(studyAudio, '⏰ পড়া শেষ! ব্রেক নিন।'); }
    }, 1000);
});
document.getElementById('stopTimerBtn').addEventListener('click', () => { clearInterval(timerInterval); isTimerRunning = false; timeRemaining = 0; updateTimerDisplay(); });

const alarmModal = document.getElementById('alarmModal'); const alarmTitle = document.getElementById('alarmTitle'); const stopAlarmBtn = document.getElementById('stopAlarmBtn');
let currentPlayingAudio = null;
function playAlarm(audioElement, titleText) { alarmTitle.innerText = titleText; alarmModal.style.display = 'flex'; currentPlayingAudio = audioElement; currentPlayingAudio.play(); }
stopAlarmBtn.addEventListener('click', () => { if(currentPlayingAudio) { currentPlayingAudio.pause(); currentPlayingAudio.currentTime = 0; } alarmModal.style.display = 'none'; });

syncWithFirebase(todayString);
