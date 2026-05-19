const firebaseUrl = "https://myrecoveryapp-a6d50-default-rtdb.firebaseio.com/";

const dateInput = document.getElementById('currentDate');
const summaryDateSelector = document.getElementById('summaryDateSelector');
const monthSelector = document.getElementById('monthSelector');
const today = new Date();
const todayString = today.toISOString().split('T')[0];
const currentMonthString = todayString.slice(0, 7);

dateInput.value = todayString;
summaryDateSelector.value = todayString;
monthSelector.value = currentMonthString;

let currentData = {};
let targetGoal = { name: '', target: 0 };
let debts = [];

// ফায়ারবেস থেকে ডাটা লোড করার ফাংশন
async function loadDataFromFirebase(date) {
    try {
        let res = await fetch(firebaseUrl + "data/" + date + ".json");
        let data = await res.json();
        
        if (data) {
            currentData = data;
        } else {
            currentData = {
                addedMoney: 0, savings: 0, cigarettes: 0, cigPrice: 15, expenses: [], 
                namaz: [], namazAlarm: false, gambled: 'no', gamblingLoss: 0, 
                weed: 'no', studyMinutes: 0, basePocketMoney: 0, closingBalance: 0
            };
        }
        
        // Ensure values are numbers
        currentData.cigarettes = currentData.cigarettes || 0;
        currentData.cigPrice = currentData.cigPrice || 15;
        currentData.savings = currentData.savings || 0;
        currentData.addedMoney = currentData.addedMoney || 0;
        currentData.gamblingLoss = currentData.gamblingLoss || 0;
        currentData.expenses = currentData.expenses || [];
        
        updateUI();
        generateDailySummary(date);
    } catch (e) {
        console.error("Firebase fetch error", e);
    }
}

async function loadGlobalData() {
    try {
        let res = await fetch(firebaseUrl + "global.json");
        let data = await res.json();
        if(data) {
            targetGoal = data.goal || { name: '', target: 0 };
            debts = data.debts || [];
        }
        updateGoalUI();
        renderDebts();
    } catch (e) { console.error(e); }
}

async function saveToFirebase() {
    calculateFinance();
    try {
        await fetch(firebaseUrl + "data/" + dateInput.value + ".json", {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentData)
        });
        updateGoalUI();
        generateDailySummary(summaryDateSelector.value);
    } catch (e) { console.error(e); }
}

async function saveGlobalData() {
    try {
        await fetch(firebaseUrl + "global.json", {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal: targetGoal, debts: debts })
        });
    } catch (e) { console.error(e); }
}

const addedMoneyInput = document.getElementById('addedMoney');
const dailySavingsInput = document.getElementById('dailySavings');
const cigCountDisplay = document.getElementById('cigCountDisplay');
const cigPriceInput = document.getElementById('cigPrice');
const namazCheckboxes = document.querySelectorAll('.namaz-wakt');
const namazAlarmToggle = document.getElementById('namazAlarmToggle');
const gambledSelect = document.getElementById('gambled');
const gamblingLossInput = document.getElementById('gamblingLoss');
const weedSelect = document.getElementById('weedStatus');

async function updateGoalUI() {
    if(targetGoal.target > 0) {
        let totalSaved = 0;
        try {
            let res = await fetch(firebaseUrl + "data.json");
            let allData = await res.json();
            if(allData) {
                for (let key in allData) {
                    totalSaved += allData[key].savings || 0;
                }
            }
        } catch(e) {}
        
        let percentage = Math.min((totalSaved / targetGoal.target) * 100, 100);
        document.getElementById('goalStatusText').innerHTML = `<strong>${targetGoal.name}</strong> এর জন্য জমানো হয়েছে: ${totalSaved}/${targetGoal.target} ৳`;
        document.getElementById('goalProgressBar').style.width = percentage + '%';
    } else {
        document.getElementById('goalStatusText').innerText = "কোনো টার্গেট সেট করা নেই";
        document.getElementById('goalProgressBar').style.width = '0%';
    }
}

document.getElementById('setGoalBtn').addEventListener('click', () => {
    let name = document.getElementById('goalName').value;
    let amt = parseFloat(document.getElementById('goalAmount').value);
    if(name && amt) {
        targetGoal = { name: name, target: amt };
        saveGlobalData(); updateGoalUI(); alert('টার্গেট সেট হয়েছে!');
    }
});

function renderDebts() {
    const list = document.getElementById('debtList');
    list.innerHTML = '';
    debts.forEach((debt, index) => {
        let li = document.createElement('li');
        let typeClass = debt.type === 'owe_them' ? 'debt-owe' : 'debt-get';
        let typeText = debt.type === 'owe_them' ? 'সে পাবে' : 'আমি পাব';
        if(debt.paid) li.classList.add('debt-done');
        
        li.innerHTML = `
            <div>
                <strong>${debt.person}</strong>: ${debt.amount} ৳ <br>
                <span class="debt-badge ${typeClass}">${typeText}</span>
            </div>
            <div>
                <button onclick="toggleDebt(${index})" style="background:#0984e3; padding:6px 10px; font-size:12px; color:white; border:none; cursor:pointer;">${debt.paid ? 'আন-পেইড' : 'শোধ'}</button>
                <button onclick="deleteDebt(${index})" style="background:#d63031; padding:6px 10px; font-size:12px; color:white; border:none; cursor:pointer;">X</button>
            </div>
        `;
        list.appendChild(li);
    });
}
window.toggleDebt = (index) => { debts[index].paid = !debts[index].paid; saveGlobalData(); renderDebts(); };
window.deleteDebt = (index) => { debts.splice(index, 1); saveGlobalData(); renderDebts(); };

document.getElementById('addDebtBtn').addEventListener('click', () => {
    let person = document.getElementById('debtPerson').value;
    let amt = parseFloat(document.getElementById('debtAmount').value);
    let type = document.getElementById('debtType').value;
    if(person && amt) {
        debts.push({ person, amount: amt, type, paid: false });
        saveGlobalData(); renderDebts();
        document.getElementById('debtPerson').value = ''; document.getElementById('debtAmount').value = '';
    }
});

function calculateFinance() {
    let otherExpenses = currentData.expenses ? currentData.expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;
    let cigExpense = (currentData.cigarettes || 0) * (currentData.cigPrice || 15);
    let totalKhoroch = otherExpenses + cigExpense + (currentData.gamblingLoss || 0) + (currentData.savings || 0);
    
    let totalAvailable = (currentData.basePocketMoney || 0) + (currentData.addedMoney || 0);
    let balance = totalAvailable - totalKhoroch;
    currentData.closingBalance = balance;

    document.getElementById('carryOverBalance').innerText = currentData.basePocketMoney || 0;
    document.getElementById('totalSpentToday').innerText = totalKhoroch - (currentData.savings || 0); 
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
    if(currentData.expenses) {
        currentData.expenses.forEach(exp => {
            let li = document.createElement('li');
            li.innerHTML = `<span>${exp.note}</span> <strong>${exp.amount} ৳</strong>`;
            document.getElementById('dailyExpenseList').appendChild(li);
        });
    }

    namazCheckboxes.forEach(cb => { 
        cb.checked = currentData.namaz ? currentData.namaz.includes(cb.value) : false; 
    });
    namazAlarmToggle.checked = currentData.namazAlarm || false;
    gambledSelect.value = currentData.gambled || 'no';
    gamblingLossInput.value = currentData.gamblingLoss || 0;
    weedSelect.value = currentData.weed || 'no';

    calculateFinance();
}

function collectDataFromUI() {
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
    
    saveToFirebase();
}

addedMoneyInput.addEventListener('change', collectDataFromUI);
dailySavingsInput.addEventListener('change', collectDataFromUI);
cigPriceInput.addEventListener('change', collectDataFromUI);
gamblingLossInput.addEventListener('change', collectDataFromUI);
gambledSelect.addEventListener('change', collectDataFromUI);
weedSelect.addEventListener('change', collectDataFromUI);
namazAlarmToggle.addEventListener('change', collectDataFromUI);
namazCheckboxes.forEach(cb => cb.addEventListener('change', collectDataFromUI));

dateInput.addEventListener('change', (e) => {
    summaryDateSelector.value = e.target.value; 
    loadDataFromFirebase(e.target.value);
});

document.getElementById('addCigBtn').addEventListener('click', () => { 
    currentData.cigarettes = (currentData.cigarettes || 0) + 1; 
    saveToFirebase(); updateUI(); 
});
document.getElementById('removeCigBtn').addEventListener('click', () => { 
    if(currentData.cigarettes > 0) currentData.cigarettes--; 
    saveToFirebase(); updateUI(); 
});
document.getElementById('addExpenseBtn').addEventListener('click', () => {
    let note = document.getElementById('expenseNote').value;
    let amt = document.getElementById('expenseAmount').value;
    if(note && amt) {
        if(!currentData.expenses) currentData.expenses = [];
        currentData.expenses.push({ note: note, amount: parseFloat(amt) });
        saveToFirebase(); updateUI();
        document.getElementById('expenseNote').value = ''; document.getElementById('expenseAmount').value = '';
    }
});

document.getElementById('saveDailyRecordBtn').addEventListener('click', () => { collectDataFromUI(); alert('হিসাব ক্লাউডে সেভ হয়েছে!'); });

async function generateDailySummary(dateStr) {
    try {
        let res = await fetch(firebaseUrl + "data/" + dateStr + ".json");
        let data = await res.json();
        
        if(!data) {
            document.getElementById('dailySummaryText').innerHTML = "এই তারিখের ডাটা নেই।";
            return;
        }

        let cigExp = (data.cigarettes || 0) * (data.cigPrice || 15);
        let namazText = (data.namaz && data.namaz.length > 0) ? data.namaz.join(', ') : 'পড়া হয়নি ❌';
        
        let text = `
            <p><strong>তারিখ:</strong> <span>${dateStr}</span></p>
            <p><strong>নামাজ:</strong> <span>${namazText}</span></p>
            <p><strong>পড়াশোনা:</strong> <span>${data.studyMinutes || 0} মিনিট</span></p>
            <p><strong>সিগারেট:</strong> <span>${data.cigarettes || 0} টি (খরচ: ${cigExp} ৳)</span></p>
            <p><strong>জুয়া:</strong> <span>${data.gambled === 'yes' ? `<strong style="color:red">লস: ${data.gamblingLoss} ৳ 😞</strong>` : `<strong style="color:green">খেলেননি ✅</strong>`}</span></p>
            <p><strong>সেভিংস:</strong> <span style="color:#00b894; font-weight:bold;">${data.savings || 0} ৳</span></p>
        `;
        document.getElementById('dailySummaryText').innerHTML = text;
    } catch(e) {}
}

summaryDateSelector.addEventListener('change', (e) => { generateDailySummary(e.target.value); });

document.getElementById('tabDaily').addEventListener('click', function() {
    this.classList.add('active'); document.getElementById('tabMonthly').classList.remove('active');
    document.getElementById('dailySummaryContainer').style.display = 'block'; document.getElementById('monthlySummaryContainer').style.display = 'none';
});
document.getElementById('tabMonthly').addEventListener('click', function() {
    this.classList.add('active'); document.getElementById('tabDaily').classList.remove('active');
    document.getElementById('dailySummaryContainer').style.display = 'none'; document.getElementById('monthlySummaryContainer').style.display = 'block';
    calcMonthlyStats(monthSelector.value);
});
monthSelector.addEventListener('change', (e) => calcMonthlyStats(e.target.value));

async function calcMonthlyStats(monthStr) {
    let tCig = 0, tCigExp = 0, tLoss = 0, tExp = 0, tSav = 0, gDays = 0, tStudy = 0;
    try {
        let res = await fetch(firebaseUrl + "data.json");
        let allData = await res.json();
        
        if(allData) {
            for (let key in allData) {
                if (key.startsWith(monthStr)) {
                    let d = allData[key];
                    tCig += d.cigarettes || 0; tCigExp += (d.cigarettes || 0) * (d.cigPrice || 15);
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

const alarmModal = document.getElementById('alarmModal');
const alarmTitle = document.getElementById('alarmTitle');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
let currentPlayingAudio = null;

function playAlarm(audioElement, titleText) {
    alarmTitle.innerText = titleText;
    alarmModal.style.display = 'flex';
    currentPlayingAudio = audioElement;
    currentPlayingAudio.play();
}

stopAlarmBtn.addEventListener('click', () => {
    if(currentPlayingAudio) { currentPlayingAudio.pause(); currentPlayingAudio.currentTime = 0; }
    alarmModal.style.display = 'none';
});

let timerInterval; let timeRemaining = 0; let isTimerRunning = false; let currentSessionMinutes = 0;
const studyAudio = document.getElementById('studyAlarmAudio');

function updateTimerDisplay() {
    document.getElementById('minutesDisplay').innerText = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    document.getElementById('secondsDisplay').innerText = (timeRemaining % 60).toString().padStart(2, '0');
}
document.getElementById('startTimerBtn').addEventListener('click', () => {
    if (isTimerRunning) return;
    let mins = parseInt(document.getElementById('customStudyTime').value);
    if (isNaN(mins) || mins <= 0) return alert('সঠিক সময় দিন!');
    
    currentSessionMinutes = mins; timeRemaining = mins * 60; isTimerRunning = true; updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeRemaining--; updateTimerDisplay();
        if (timeRemaining <= 0) {
            clearInterval(timerInterval); isTimerRunning = false;
            currentData.studyMinutes = (currentData.studyMinutes || 0) + currentSessionMinutes; 
            saveToFirebase(); updateUI();
            playAlarm(studyAudio, '⏰ পড়া শেষ! ব্রেক নিন।');
        }
    }, 1000);
});
document.getElementById('stopTimerBtn').addEventListener('click', () => {
    clearInterval(timerInterval); isTimerRunning = false; timeRemaining = 0; updateTimerDisplay();
});

const adhanAudio = document.getElementById('adhanAudio');
let prayerTimes = {};
async function fetchPrayerTimes() {
    try {
        let res = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Dhaka&country=Bangladesh&method=1');
        let data = await res.json();
        prayerTimes = data.data.timings;
    } catch(err) {}
}
function checkAlarm() {
    if(!namazAlarmToggle.checked) return;
    let now = new Date();
    let timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    let currentWakt = "";
    if(timeStr === prayerTimes.Fajr) currentWakt = "ফজর";
    else if(timeStr === prayerTimes.Dhuhr) currentWakt = "যোহর";
    else if(timeStr === prayerTimes.Asr) currentWakt = "আসর";
    else if(timeStr === prayerTimes.Maghrib) currentWakt = "মাগরিব";
    else if(timeStr === prayerTimes.Isha) currentWakt = "এশা";

    if(currentWakt !== "") playAlarm(adhanAudio, `🕌 ${currentWakt} নামাজের সময় হয়েছে!`);
}
fetchPrayerTimes(); setInterval(checkAlarm, 60000);

loadGlobalData();
loadDataFromFirebase(todayString);
