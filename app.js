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
            // ডাটা না থাকলে নতুন কাঠামোর ডিফল্ট ডাটা
            currentData = {
                addedMoney: 0, savings: 0, cigarettes: 0, cigPrice: 15, expenses: [], 
                namaz: [], namazAlarm: false, gambled: 'no', gamblingLoss: 0, 
                weed: 'no', studyMinutes: 0, basePocketMoney: 0, closingBalance: 0
            };
        }
        updateUI();
        generateDailySummary(date);
    } catch (e) {
        console.error("ফায়ারবেস থেকে ডাটা লোড করতে সমস্যা হয়েছে!", e);
    }
}

// ফায়ারবেস থেকে গ্লোবাল ডাটা (টার্গেট ও ধারদেনা) লোড
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

// ফায়ারবেসে ডাটা সেভ করার ফাংশন
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
    } catch (e) {
        console.error("ফায়ারবেসে সেভ করতে সমস্যা হয়েছে!", e);
    }
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

// টার্গেট সেভিংস লজিক
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
        saveGlobalData();
        updateGoalUI();
        alert('নতুন সেভিংস টার্গেট সেট করা হয়েছে!');
    }
});

// ধারদেনা লজিক
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
                <button onclick="toggleDebt(${index})" style="background:#0984e3; padding:6px 10px; font-size:12px;">${debt.paid ? 'আন-পেইড করুন' : 'শোধ হয়েছে'}</button>
                <button onclick="deleteDebt(${index})" style="background:#d63031; padding:6px 10px; font-size:12px;">X</button>
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
    let cigExpense = currentData.cigarettes * currentData.cigPrice;
    let totalKhoroch = otherExpenses + cigExpense + currentData.gamblingLoss + currentData.savings;
    
    let totalAvailable = currentData.basePocketMoney + currentData.addedMoney;
    let balance = totalAvailable - totalKhoroch;
    currentData.closingBalance = balance;

    document.getElementById('carryOverBalance').innerText = currentData.basePocketMoney;
    document.getElementById('totalSpentToday').innerText = totalKhoroch - currentData.savings; 
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
    currentData.gamblingLoss =
