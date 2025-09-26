let db;

// IndexedDB初期化
const request = indexedDB.open('householdDB', 1);

request.onupgradeneeded = function(e) {
  db = e.target.result;
  const store = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
  store.createIndex('date', 'date', { unique: false });
};

request.onsuccess = function(e) {
  db = e.target.result;
  displayEntries();
};

request.onerror = function(e) {
  console.error('IndexedDB エラー', e.target.errorCode);
};

// フォーム送信
document.getElementById('entryForm').addEventListener('submit', function(e){
  e.preventDefault();
  const entry = {
    date: document.getElementById('date').value,
    amount: parseInt(document.getElementById('amount').value),
    type: document.getElementById('type').value,
    category: document.getElementById('category').value,
    memo: document.getElementById('memo').value
  };

  const tx = db.transaction(['entries'], 'readwrite');
  const store = tx.objectStore('entries');
  store.add(entry);
  tx.oncomplete = function(){
    displayEntries();
    document.getElementById('entryForm').reset();
  };
});

// 月フィルター
document.getElementById('monthFilter').addEventListener('change', () => {
  displayEntries(document.getElementById('monthFilter').value);
});

// 月ごとにグループ化
function groupEntriesByMonth(entries) {
  const groups = {};
  entries.forEach(e => {
    const month = e.date.slice(0,7); // YYYY-MM
    if(!groups[month]) groups[month] = [];
    groups[month].push(e);
  });
  return groups;
}

// 月リスト作成
function populateMonthFilter(entries) {
  const months = [...new Set(entries.map(e => e.date.slice(0,7)))].sort().reverse();
  const select = document.getElementById('monthFilter');
  months.forEach(m => {
    if([...select.options].some(opt => opt.value===m)) return;
    const option = document.createElement('option');
    option.value = m;
    option.textContent = m;
    select.appendChild(option);
  });
}

// 月ごとの合計計算
function calculateMonthlyTotals(entries) {
  let income = 0, expense = 0;
  entries.forEach(e => {
    if(e.type==='income') income += e.amount;
    else expense += e.amount;
  });
  const balance = income - expense;
  document.getElementById('incomeTotal').textContent = income;
  document.getElementById('expenseTotal').textContent = expense;
  document.getElementById('balance').textContent = balance;
}

// 合計カードを画像として保存
document.getElementById('downloadSummary').addEventListener('click', ()=>{
  const card = document.getElementById('monthSummaryCard');
  html2canvas(card).then(canvas => {
    const url = canvas.toDataURL("image/png");
    const a = document.createElement('a');
    a.href = url;
    a.download = '月ごとの合計.png';
    a.click();
  });
});

// 履歴表示
function displayEntries(filterMonth="") {
  const list = document.getElementById('entryList');
  list.innerHTML = '';
  const tx = db.transaction(['entries'], 'readonly');
  const store = tx.objectStore('entries');
  const requestAll = store.getAll();

  requestAll.onsuccess = function() {
    let entries = requestAll.result.sort((a,b)=> new Date(b.date) - new Date(a.date));
    if(filterMonth){
      entries = entries.filter(e => e.date.startsWith(filterMonth));
    }

    populateMonthFilter(requestAll.result);
    calculateMonthlyTotals(entries);

    const grouped = groupEntriesByMonth(entries);
    for(const month in grouped){
      const liMonth = document.createElement('li');
      liMonth.className = 'list-group-item active';
      liMonth.textContent = month;
      list.appendChild(liMonth);

      grouped[month].forEach(e=>{
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.textContent = `${e.date} - ${e.category || '未分類'} - ${e.type==='income'?'+':'-'}${e.amount}円 ${e.memo? '('+e.memo+')' : ''}`;
        list.appendChild(li);
      });
    }
  };
}
