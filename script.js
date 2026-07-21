// ==========================================
// STATE MANAGEMENT & LOCAL STORAGE
// ==========================================
let students = JSON.parse(localStorage.getItem('optim_students')) || [];
let staff = JSON.parse(localStorage.getItem('optim_staff')) || [];
let facultyHours = JSON.parse(localStorage.getItem('optim_hours')) || [];
let ledger = JSON.parse(localStorage.getItem('optim_ledger')) || [];
let studentAttendance = JSON.parse(localStorage.getItem('optim_std_att')) || {};
let staffAttendance = JSON.parse(localStorage.getItem('optim_stf_att')) || {};

let autoSaveEnabled = true;
let sortDirection = 'desc';

// Individual Table Sort Column Keys
let sortKeys = {
    student: { col: 'date', dir: 'desc' },
    staff: { col: 'name', dir: 'asc' },
    hours: { col: 'date', dir: 'desc' },
    ledger: { col: 'date', dir: 'desc' }
};

// Initialize App on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    ['stud-date', 'inst-date', 'hour-date', 'led-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });

    document.querySelectorAll('.live-date').forEach(el => {
        el.innerText = new Date().toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        });
    });

    renderAll();
});

function saveAllData() {
    if (!autoSaveEnabled) return;
    localStorage.setItem('optim_students', JSON.stringify(students));
    localStorage.setItem('optim_staff', JSON.stringify(staff));
    localStorage.setItem('optim_hours', JSON.stringify(facultyHours));
    localStorage.setItem('optim_ledger', JSON.stringify(ledger));
    localStorage.setItem('optim_std_att', JSON.stringify(studentAttendance));
    localStorage.setItem('optim_stf_att', JSON.stringify(staffAttendance));
}

function renderAll() {
    renderStudents();
    renderStaff();
    renderFacultyHours();
    renderLedger();
    renderAttendance();
    updateDashboardMetrics();
    populateDropdowns();
}

// Helper: Filter records by selected Date Range
function filterByDateRange(items, startDateId, endDateId, dateProp = 'date') {
    const startVal = document.getElementById(startDateId) ? document.getElementById(startDateId).value : '';
    const endVal = document.getElementById(endDateId) ? document.getElementById(endDateId).value : '';

    return items.filter(item => {
        const itemDate = item[dateProp];
        if (!itemDate) return true;
        if (startVal && itemDate < startVal) return false;
        if (endVal && itemDate > endVal) return false;
        return true;
    });
}

// Helper: Dynamic Sorting Logic
function sortData(list, key, dir) {
    return list.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
    });
}

// ==========================================
// 1. STUDENT REGISTRY & INSTALLMENTS
// ==========================================
function addStudent() {
    const name = document.getElementById('stud-name').value.trim();
    const course = document.getElementById('stud-course').value;
    const date = document.getElementById('stud-date').value;
    const fee = parseFloat(document.getElementById('stud-fee').value) || 0;
    const paid = parseFloat(document.getElementById('stud-paid').value) || 0;

    if (!name) return alert('Please enter student name.');

    students.push({
        id: 'STD-' + Date.now(),
        name, course, date, fee, paid,
        installments: paid > 0 ? [{ date, amount: paid, id: 'INS-' + Date.now() }] : []
    });

    saveAllData();
    renderAll();

    document.getElementById('stud-name').value = '';
    document.getElementById('stud-fee').value = '30000';
    document.getElementById('stud-paid').value = '10000';
}

function recordInstallment() {
    const studentId = document.getElementById('inst-student-select').value;
    const date = document.getElementById('inst-date').value;
    const amount = parseFloat(document.getElementById('inst-amount').value) || 0;

    if (!studentId) return alert('Please select a student.');
    if (amount <= 0) return alert('Please enter a valid amount.');

    const student = students.find(s => s.id === studentId);
    if (student) {
        student.paid += amount;
        student.installments.push({ id: 'INS-' + Date.now(), date, amount });
        saveAllData();
        renderAll();
        updateInstallmentFormHelper();
    }
}

function deleteStudent(id) {
    if (confirm('Delete student record?')) {
        students = students.filter(s => s.id !== id);
        delete studentAttendance[id];
        saveAllData();
        renderAll();
    }
}

function sortStudents(col) {
    if (sortKeys.student.col === col) {
        sortKeys.student.dir = sortKeys.student.dir === 'asc' ? 'desc' : 'asc';
    } else {
        sortKeys.student.col = col;
        sortKeys.student.dir = 'asc';
    }
    renderStudents();
}

function renderStudents() {
    const tbody = document.getElementById('student-table-body');
    if (!tbody) return;

    let filtered = filterByDateRange(students, 'stud-filter-start', 'stud-filter-end', 'date');
    let list = sortData([...filtered], sortKeys.student.col, sortKeys.student.dir);

    tbody.innerHTML = list.map(s => {
        const balance = s.fee - s.paid;
        const isPaid = balance <= 0;
        const historyRowId = `hist-row-${s.id}`;

        const installmentRows = s.installments.length > 0 ? s.installments.map(ins => `
            <tr><td>${ins.date}</td><td>₹${ins.amount.toLocaleString('en-IN')}</td></tr>
        `).join('') : '<tr><td colspan="2">No installments logged yet.</td></tr>';

        return `
            <tr>
                <td data-label="Date Enrolled">${s.date}</td>
                <td data-label="Student Name"><strong>${s.name}</strong></td>
                <td data-label="Course">${s.course}</td>
                <td data-label="Total Fee">₹${s.fee.toLocaleString('en-IN')}</td>
                <td data-label="Total Paid">₹${s.paid.toLocaleString('en-IN')}</td>
                <td data-label="Balance Due">₹${balance.toLocaleString('en-IN')}</td>
                <td data-label="Financial Status">
                    <span class="badge ${isPaid ? 'paid' : 'pending'}">${isPaid ? 'CLEARED' : 'PENDING'}</span>
                </td>
                <td data-label="Actions" class="no-pdf">
                    <button class="history-btn" onclick="toggleHistoryRow('${historyRowId}')">📜 History</button>
                    <button class="delete-btn" onclick="deleteStudent('${s.id}')">🗑️</button>
                </td>
            </tr>
            <tr id="${historyRowId}" class="history-row">
                <td colspan="8">
                    <div class="history-box">
                        <h5>Payment Breakout History — ${s.name}</h5>
                        <table class="history-table">
                            <thead><tr><th>Date Paid</th><th>Amount (₹)</th></tr></thead>
                            <tbody>${installmentRows}</tbody>
                        </table>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleHistoryRow(rowId) {
    const el = document.getElementById(rowId);
    if (el) el.classList.toggle('active');
}

// ==========================================
// 2. ATTENDANCE TRACKER
// ==========================================
function toggleStudentAttendance(id) {
    studentAttendance[id] = !studentAttendance[id];
    saveAllData();
    renderAttendance();
    updateDashboardMetrics();
}

function toggleStaffAttendance(id) {
    staffAttendance[id] = !staffAttendance[id];
    saveAllData();
    renderAttendance();
    updateDashboardMetrics();
}

function renderAttendance() {
    const stdBody = document.getElementById('attendance-students-body');
    const stfBody = document.getElementById('attendance-staff-body');

    if (stdBody) {
        stdBody.innerHTML = students.map(s => {
            const isPresent = !!studentAttendance[s.id];
            return `
                <tr>
                    <td data-label="Student Name"><strong>${s.name}</strong></td>
                    <td data-label="Enrolled Batch">${s.course}</td>
                    <td data-label="Attendance Status">
                        <span class="badge ${isPresent ? 'present' : 'absent'}">${isPresent ? 'PRESENT' : 'ABSENT'}</span>
                    </td>
                    <td data-label="Update Action" class="no-pdf">
                        <button class="action-btn" style="padding:4px 10px; font-size:0.75rem; background:${isPresent ? 'var(--danger)' : 'var(--success)'};" 
                            onclick="toggleStudentAttendance('${s.id}')">
                            Mark ${isPresent ? 'Absent' : 'Present'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    if (stfBody) {
        stfBody.innerHTML = staff.map(st => {
            const isPresent = !!staffAttendance[st.id];
            return `
                <tr>
                    <td data-label="Staff/Faculty Name"><strong>${st.name}</strong></td>
                    <td data-label="Core Duty">${st.duty}</td>
                    <td data-label="Daily Status">
                        <span class="badge ${isPresent ? 'present' : 'absent'}">${isPresent ? 'PRESENT' : 'ABSENT'}</span>
                    </td>
                    <td data-label="Update Action" class="no-pdf">
                        <button class="action-btn" style="padding:4px 10px; font-size:0.75rem; background:${isPresent ? 'var(--danger)' : 'var(--success)'};" 
                            onclick="toggleStaffAttendance('${st.id}')">
                            Mark ${isPresent ? 'Absent' : 'Present'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// ==========================================
// 3. STAFF & FACULTY HOURS
// ==========================================
function addStaff() {
    const name = document.getElementById('staff-name').value.trim();
    const duty = document.getElementById('staff-duty').value.trim();
    const type = document.getElementById('staff-type').value;

    if (!name || !duty) return alert('Please fill out all staff fields.');

    staff.push({ id: 'STF-' + Date.now(), name, duty, type });
    saveAllData();
    renderAll();

    document.getElementById('staff-name').value = '';
    document.getElementById('staff-duty').value = '';
}

function deleteStaff(id) {
    if (confirm('Delete team member?')) {
        staff = staff.filter(st => st.id !== id);
        delete staffAttendance[id];
        saveAllData();
        renderAll();
    }
}

function logFacultyHours() {
    const facultyId = document.getElementById('hour-faculty-select').value;
    const stream = document.getElementById('hour-stream').value;
    const date = document.getElementById('hour-date').value;
    const hours = parseFloat(document.getElementById('hour-qty').value) || 0;

    if (!facultyId) return alert('Please select a faculty member.');

    const fac = staff.find(st => st.id === facultyId);
    facultyHours.push({
        id: 'HRS-' + Date.now(),
        facultyName: fac ? fac.name : 'Unknown',
        stream, date, hours
    });

    saveAllData();
    renderFacultyHours();
}

function deleteFacultyHour(id) {
    facultyHours = facultyHours.filter(h => h.id !== id);
    saveAllData();
    renderFacultyHours();
}

function sortStaff(col) {
    if (sortKeys.staff.col === col) {
        sortKeys.staff.dir = sortKeys.staff.dir === 'asc' ? 'desc' : 'asc';
    } else {
        sortKeys.staff.col = col;
        sortKeys.staff.dir = 'asc';
    }
    renderStaff();
}

function sortHours(col) {
    if (sortKeys.hours.col === col) {
        sortKeys.hours.dir = sortKeys.hours.dir === 'asc' ? 'desc' : 'asc';
    } else {
        sortKeys.hours.col = col;
        sortKeys.hours.dir = 'asc';
    }
    renderFacultyHours();
}

function renderStaff() {
    const tbody = document.getElementById('staff-registry-body');
    if (!tbody) return;

    let list = sortData([...staff], sortKeys.staff.col, sortKeys.staff.dir);
    tbody.innerHTML = list.map(st => `
        <tr>
            <td data-label="Team Member"><strong>${st.name}</strong></td>
            <td data-label="Role / Area">${st.duty}</td>
            <td data-label="Type">${st.type}</td>
            <td data-label="Action" class="no-pdf">
                <button class="delete-btn" onclick="deleteStaff('${st.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderFacultyHours() {
    const tbody = document.getElementById('faculty-hours-body');
    if (!tbody) return;

    let filtered = filterByDateRange(facultyHours, 'hours-filter-start', 'hours-filter-end', 'date');
    let list = sortData([...filtered], sortKeys.hours.col, sortKeys.hours.dir);

    tbody.innerHTML = list.map(h => `
        <tr>
            <td data-label="Date">${h.date}</td>
            <td data-label="Faculty Member"><strong>${h.facultyName}</strong></td>
            <td data-label="Course Batch">${h.stream}</td>
            <td data-label="Duration">${h.hours} hrs</td>
            <td data-label="Action" class="no-pdf">
                <button class="delete-btn" onclick="deleteFacultyHour('${h.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// ==========================================
// 4. CASHBOOK LEDGER
// ==========================================
function addLedgerEntry() {
    const type = document.getElementById('led-type').value;
    const date = document.getElementById('led-date').value;
    const cat = document.getElementById('led-cat').value.trim();
    const desc = document.getElementById('led-desc').value.trim();
    const amount = parseFloat(document.getElementById('led-amount').value) || 0;

    if (!cat || amount <= 0) return alert('Please fill out category and valid amount.');

    ledger.push({ id: 'LED-' + Date.now(), type, date, cat, desc, amount });
    saveAllData();
    renderAll();

    document.getElementById('led-cat').value = '';
    document.getElementById('led-desc').value = '';
    document.getElementById('led-amount').value = '1000';
}

function deleteLedgerEntry(id) {
    if (confirm('Delete ledger record?')) {
        ledger = ledger.filter(l => l.id !== id);
        saveAllData();
        renderAll();
    }
}

function sortLedger(col) {
    if (sortKeys.ledger.col === col) {
        sortKeys.ledger.dir = sortKeys.ledger.dir === 'asc' ? 'desc' : 'asc';
    } else {
        sortKeys.ledger.col = col;
        sortKeys.ledger.dir = 'asc';
    }
    renderLedger();
}

function renderLedger() {
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return;

    let filtered = filterByDateRange(ledger, 'ledger-filter-start', 'ledger-filter-end', 'date');
    let list = sortData([...filtered], sortKeys.ledger.col, sortKeys.ledger.dir);

    tbody.innerHTML = list.map(l => `
        <tr>
            <td data-label="Date">${l.date}</td>
            <td data-label="Type">
                <span class="badge ${l.type === 'Income' ? 'paid' : 'absent'}">${l.type.toUpperCase()}</span>
            </td>
            <td data-label="Category">${l.cat}</td>
            <td data-label="Description">${l.desc || '-'}</td>
            <td data-label="Amount">₹${l.amount.toLocaleString('en-IN')}</td>
            <td data-label="Action" class="no-pdf">
                <button class="delete-btn" onclick="deleteLedgerEntry('${l.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// ==========================================
// 5. EXPORT TO PDF FUNCTIONALITY
// ==========================================
function exportTableToPDF(filename, containerId) {
    const element = document.getElementById(containerId);
    if (!element) return;

    element.classList.add('pdf-export-active');

    const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.classList.remove('pdf-export-active');
    });
}

// Dashboard Analytics & Helpers
function updateDashboardMetrics() {
    const totalInvoiced = students.reduce((acc, s) => acc + (s.fee || 0), 0);
    const studentCollected = students.reduce((acc, s) => acc + (s.paid || 0), 0);
    const totalOutstanding = totalInvoiced - studentCollected;

    const ledgerIncome = ledger.filter(l => l.type === 'Income').reduce((acc, l) => acc + l.amount, 0);
    const ledgerExpenses = ledger.filter(l => l.type === 'Expense').reduce((acc, l) => acc + l.amount, 0);

    const totalCollected = studentCollected + ledgerIncome;

    document.getElementById('dash-total-invoiced').innerText = '₹' + totalInvoiced.toLocaleString('en-IN');
    document.getElementById('dash-total-collected').innerText = '₹' + totalCollected.toLocaleString('en-IN');
    document.getElementById('dash-total-outstanding').innerText = '₹' + totalOutstanding.toLocaleString('en-IN');
    document.getElementById('dash-total-expenses').innerText = '₹' + ledgerExpenses.toLocaleString('en-IN');

    const stdPresentCount = Object.values(studentAttendance).filter(Boolean).length;
    const stdPct = students.length ? Math.round((stdPresentCount / students.length) * 100) : 0;

    const stfPresentCount = Object.values(staffAttendance).filter(Boolean).length;
    const stfPct = staff.length ? Math.round((stfPresentCount / staff.length) * 100) : 0;

    document.getElementById('dash-students-present').innerText = stdPresentCount;
    document.getElementById('dash-student-pct').innerText = `${stdPct}% of registry (${students.length} total)`;

    document.getElementById('dash-staff-present').innerText = stfPresentCount;
    document.getElementById('dash-staff-pct').innerText = `${stfPct}% of registry (${staff.length} total)`;

    const campusList = document.getElementById('active-on-campus-list');
    if (campusList) {
        let items = [];
        students.forEach(s => {
            if (studentAttendance[s.id]) {
                items.push(`<li class="presence-item"><span>🎓 ${s.name}</span> <span class="role">${s.course}</span></li>`);
            }
        });
        staff.forEach(st => {
            if (staffAttendance[st.id]) {
                items.push(`<li class="presence-item"><span>👨‍🏫 ${st.name}</span> <span class="role">${st.duty}</span></li>`);
            }
        });
        campusList.innerHTML = items.length > 0 ? items.join('') : '<li class="presence-item" style="color:var(--text-muted)">No students or staff currently marked present.</li>';
    }
}

function populateDropdowns() {
    const instSelect = document.getElementById('inst-student-select');
    if (instSelect) {
        const currentVal = instSelect.value;
        instSelect.innerHTML = '<option value="">-- Choose Student --</option>' + 
            students.map(s => `<option value="${s.id}">${s.name} (${s.course})</option>`).join('');
        instSelect.value = currentVal;
    }

    const hourSelect = document.getElementById('hour-faculty-select');
    if (hourSelect) {
        const currentVal = hourSelect.value;
        const targetList = staff.filter(st => st.type === 'Part Time Expert' || st.type === 'Part Time Faculty');
        const listToUse = targetList.length ? targetList : staff;

        hourSelect.innerHTML = '<option value="">-- Choose Faculty --</option>' + 
            listToUse.map(st => `<option value="${st.id}">${st.name} - ${st.duty}</option>`).join('');
        hourSelect.value = currentVal;
    }
}

function updateInstallmentFormHelper() {
    const select = document.getElementById('inst-student-select');
    const helper = document.getElementById('inst-helper-info');
    if (!select || !helper) return;

    const student = students.find(s => s.id === select.value);
    if (student) {
        const bal = student.fee - student.paid;
        helper.innerText = `Paid: ₹${student.paid.toLocaleString('en-IN')} | Pending Balance: ₹${bal.toLocaleString('en-IN')}`;
    } else {
        helper.innerText = 'No student selected';
    }
}

function setMasterSortDirection(dir) {
    sortDirection = dir;
    ['student', 'staff', 'hours', 'ledger'].forEach(k => sortKeys[k].dir = dir);
    document.getElementById('sort-desc-btn').classList.toggle('active', dir === 'desc');
    document.getElementById('sort-asc-btn').classList.toggle('active', dir === 'asc');
    renderAll();
}

function toggleAutoSave() {
    autoSaveEnabled = !autoSaveEnabled;
    const pill = document.getElementById('auto-save-pill');
    if (pill) {
        pill.classList.toggle('active', autoSaveEnabled);
        pill.classList.toggle('inactive', !autoSaveEnabled);
        pill.innerText = `Auto-Save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
    }
}

function saveToLocalStorage(showNotice = false) {
    saveAllData();
    if (showNotice) alert('All portal data manually saved to local storage!');
}

function openSidebar() {
    document.getElementById('main-sidebar').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('active');
}

function closeSidebar() {
    document.getElementById('main-sidebar').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('active');
}

function switchPane(paneId, navElement) {
    document.querySelectorAll('.portal-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));

    document.getElementById('pane-' + paneId).classList.add('active');
    if (navElement) navElement.classList.add('active');

    const titleMap = {
        'dashboard': 'Super Dashboard',
        'students': 'Student Registry & Fees',
        'attendance': 'Live Attendance Tracker',
        'faculty': 'Staff & Faculty Registry',
        'finance': 'Ledger (Inc / Exp)'
    };
    document.getElementById('current-pane-title').innerText = titleMap[paneId] || 'Management Portal';
    closeSidebar();
}

function filterTable(input, targetBodyId) {
    const filter = input.value.toLowerCase();
    const rows = document.querySelectorAll(`#${targetBodyId} tr`);
    rows.forEach(row => {
        if (row.classList.contains('history-row')) return;
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
    });
}