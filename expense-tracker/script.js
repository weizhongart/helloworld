// 全局变量
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let editingTransactionId = null;

// DOM 元素
const transactionForm = document.getElementById('transactionForm');
const editForm = document.getElementById('editForm');
const transactionsList = document.getElementById('transactionsList');
const totalBalance = document.getElementById('totalBalance');
const totalIncome = document.getElementById('totalIncome');
const totalExpense = document.getElementById('totalExpense');
const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const filterType = document.getElementById('filterType');
const clearAllBtn = document.getElementById('clearAll');
const editModal = document.getElementById('editModal');
const categoryStats = document.getElementById('categoryStats');
const expenseChart = document.getElementById('expenseChart');

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 设置今天的日期为默认值
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('editDate').value = today;
    
    // 初始化事件监听器
    initEventListeners();
    
    // 渲染数据
    updateBalance();
    renderTransactions();
    renderStatistics();
});

// 初始化事件监听器
function initEventListeners() {
    // 表单提交
    transactionForm.addEventListener('submit', addTransaction);
    editForm.addEventListener('submit', updateTransaction);
    
    // 类型选择器
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const container = this.closest('.type-selector');
            container.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // 搜索和筛选
    searchInput.addEventListener('input', filterTransactions);
    filterCategory.addEventListener('change', filterTransactions);
    filterType.addEventListener('change', filterTransactions);
    
    // 清空所有记录
    clearAllBtn.addEventListener('click', clearAllTransactions);
    
    // 模态框关闭
    editModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditModal();
        }
    });
}

// 添加交易记录
function addTransaction(e) {
    e.preventDefault();
    
    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const type = document.querySelector('.type-btn.active').dataset.type;
    
    // 验证输入
    if (!description || !amount || !category || !date) {
        showMessage('请填写所有必填字段', 'error');
        return;
    }
    
    if (amount <= 0) {
        showMessage('金额必须大于0', 'error');
        return;
    }
    
    const transaction = {
        id: Date.now(),
        description,
        amount: type === 'expense' ? -amount : amount,
        category,
        date,
        type,
        timestamp: new Date().toISOString()
    };
    
    transactions.unshift(transaction);
    saveTransactions();
    updateBalance();
    renderTransactions();
    renderStatistics();
    
    // 重置表单
    transactionForm.reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    
    // 重置类型选择器
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.type-btn[data-type="expense"]').classList.add('active');
    
    showMessage('交易记录添加成功！', 'success');
}

// 渲染交易记录列表
function renderTransactions(filteredTransactions = null) {
    const transactionsToRender = filteredTransactions || transactions;
    
    if (transactionsToRender.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>暂无交易记录</p>
                <small>添加您的第一笔记录开始记账吧！</small>
            </div>
        `;
        return;
    }
    
    const transactionsHTML = transactionsToRender.map(transaction => {
        const formattedDate = new Date(transaction.date).toLocaleDateString('zh-CN');
        const amountText = transaction.type === 'income' ? `+¥${Math.abs(transaction.amount).toFixed(2)}` : `-¥${Math.abs(transaction.amount).toFixed(2)}`;
        
        return `
            <div class="transaction-item ${transaction.type}" data-id="${transaction.id}">
                <div class="transaction-info">
                    <h4>${transaction.description}</h4>
                    <div class="transaction-meta">
                        ${transaction.category} • ${formattedDate}
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${amountText}
                </div>
                <div class="transaction-actions">
                    <button class="action-btn edit-btn" onclick="editTransaction(${transaction.id})">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    transactionsList.innerHTML = transactionsHTML;
}

// 更新余额显示
function updateBalance() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const balance = income - expense;
    
    totalIncome.textContent = `¥${income.toFixed(2)}`;
    totalExpense.textContent = `¥${expense.toFixed(2)}`;
    totalBalance.textContent = `¥${balance.toFixed(2)}`;
    
    // 根据余额正负设置颜色
    totalBalance.className = `amount ${balance >= 0 ? 'income' : 'expense'}`;
}

// 编辑交易记录
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    editingTransactionId = id;
    
    // 填充编辑表单
    document.getElementById('editDescription').value = transaction.description;
    document.getElementById('editAmount').value = Math.abs(transaction.amount);
    document.getElementById('editCategory').value = transaction.category;
    document.getElementById('editDate').value = transaction.date;
    
    // 设置类型选择器
    const editTypeButtons = editModal.querySelectorAll('.type-btn');
    editTypeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === transaction.type);
    });
    
    // 显示模态框
    editModal.classList.add('show');
}

// 更新交易记录
function updateTransaction(e) {
    e.preventDefault();
    
    const description = document.getElementById('editDescription').value.trim();
    const amount = parseFloat(document.getElementById('editAmount').value);
    const category = document.getElementById('editCategory').value;
    const date = document.getElementById('editDate').value;
    const type = editModal.querySelector('.type-btn.active').dataset.type;
    
    if (!description || !amount || !category || !date) {
        showMessage('请填写所有必填字段', 'error');
        return;
    }
    
    if (amount <= 0) {
        showMessage('金额必须大于0', 'error');
        return;
    }
    
    const transactionIndex = transactions.findIndex(t => t.id === editingTransactionId);
    if (transactionIndex === -1) return;
    
    transactions[transactionIndex] = {
        ...transactions[transactionIndex],
        description,
        amount: type === 'expense' ? -amount : amount,
        category,
        date,
        type
    };
    
    saveTransactions();
    updateBalance();
    renderTransactions();
    renderStatistics();
    closeEditModal();
    
    showMessage('交易记录更新成功！', 'success');
}

// 删除交易记录
function deleteTransaction(id) {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    updateBalance();
    renderTransactions();
    renderStatistics();
    
    showMessage('交易记录删除成功！', 'success');
}

// 筛选交易记录
function filterTransactions() {
    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilter = filterCategory.value;
    const typeFilter = filterType.value;
    
    const filtered = transactions.filter(transaction => {
        const matchesSearch = transaction.description.toLowerCase().includes(searchTerm) ||
                            transaction.category.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || transaction.category === categoryFilter;
        const matchesType = !typeFilter || transaction.type === typeFilter;
        
        return matchesSearch && matchesCategory && matchesType;
    });
    
    renderTransactions(filtered);
}

// 清空所有记录
function clearAllTransactions() {
    if (!transactions.length) {
        showMessage('暂无记录可清空', 'error');
        return;
    }
    
    if (!confirm('确定要清空所有记录吗？此操作不可恢复！')) return;
    
    transactions = [];
    saveTransactions();
    updateBalance();
    renderTransactions();
    renderStatistics();
    
    showMessage('所有记录已清空！', 'success');
}

// 关闭编辑模态框
function closeEditModal() {
    editModal.classList.remove('show');
    editingTransactionId = null;
}

// 渲染统计数据
function renderStatistics() {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    if (expenseTransactions.length === 0) {
        categoryStats.innerHTML = `
            <div class="empty-state">
                <p>暂无支出数据</p>
            </div>
        `;
        drawEmptyChart();
        return;
    }
    
    // 按分类统计支出
    const categoryTotals = {};
    let totalExpenseAmount = 0;
    
    expenseTransactions.forEach(transaction => {
        const amount = Math.abs(transaction.amount);
        categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + amount;
        totalExpenseAmount += amount;
    });
    
    // 排序并生成统计列表
    const sortedCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8); // 只显示前8个分类
    
    const statsHTML = sortedCategories.map(([category, amount]) => {
        const percentage = ((amount / totalExpenseAmount) * 100).toFixed(1);
        const color = getCategoryColor(category);
        
        return `
            <div class="stat-item" style="border-left-color: ${color}">
                <span class="category">${category}</span>
                <div>
                    <span class="amount">¥${amount.toFixed(2)}</span>
                    <span class="percentage">${percentage}%</span>
                </div>
            </div>
        `;
    }).join('');
    
    categoryStats.innerHTML = statsHTML;
    
    // 绘制饼图
    drawPieChart(sortedCategories, totalExpenseAmount);
}

// 绘制饼图
function drawPieChart(data, total) {
    const canvas = expenseChart;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (data.length === 0) {
        drawEmptyChart();
        return;
    }
    
    let currentAngle = -Math.PI / 2; // 从顶部开始
    
    data.forEach(([category, amount]) => {
        const percentage = amount / total;
        const sliceAngle = percentage * 2 * Math.PI;
        const color = getCategoryColor(category);
        
        // 绘制扇形
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        
        // 绘制边框
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        currentAngle += sliceAngle;
    });
    
    // 在中心绘制总金额
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('总支出', centerX, centerY - 10);
    ctx.font = 'bold 20px Inter';
    ctx.fillText(`¥${total.toFixed(0)}`, centerX, centerY + 15);
}

// 绘制空白图表
function drawEmptyChart() {
    const canvas = expenseChart;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制空状态
    ctx.fillStyle = '#e0e6ed';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#999';
    ctx.font = '16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', centerX, centerY);
}

// 获取分类颜色
function getCategoryColor(category) {
    const colors = {
        '食物': '#FF6B6B',
        '交通': '#4ECDC4',
        '购物': '#45B7D1',
        '娱乐': '#96CEB4',
        '住房': '#FECA57',
        '医疗': '#FF9FF3',
        '教育': '#54A0FF',
        '工资': '#5F27CD',
        '奖金': '#00D2D3',
        '投资': '#FF9F43',
        '兼职': '#10AC84',
        '其他收入': '#EE5A24',
        '其他支出': '#EA2027'
    };
    
    return colors[category] || '#95A5A6';
}

// 保存数据到本地存储
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// 显示消息提示
function showMessage(message, type = 'success') {
    // 移除已存在的消息
    const existingMessage = document.querySelector('.success-message, .error-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = type === 'success' ? 'success-message' : 'error-message';
    messageEl.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    
    // 添加错误消息的样式
    if (type === 'error') {
        messageEl.style.background = '#e74c3c';
        messageEl.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.3)';
    }
    
    document.body.appendChild(messageEl);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.style.transform = 'translateX(100%)';
            messageEl.style.opacity = '0';
            setTimeout(() => messageEl.remove(), 300);
        }
    }, 3000);
}

// 导出数据
function exportData() {
    if (transactions.length === 0) {
        showMessage('暂无数据可导出', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `expense-tracker-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showMessage('数据导出成功！', 'success');
}

// 导入数据
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                if (confirm('导入数据将覆盖现有数据，确定继续吗？')) {
                    transactions = importedData;
                    saveTransactions();
                    updateBalance();
                    renderTransactions();
                    renderStatistics();
                    showMessage('数据导入成功！', 'success');
                }
            } else {
                showMessage('文件格式不正确', 'error');
            }
        } catch (error) {
            showMessage('文件解析失败', 'error');
        }
    };
    reader.readAsText(file);
}

// 添加键盘快捷键支持
document.addEventListener('keydown', function(e) {
    // Ctrl+Enter 快速添加记录
    if (e.ctrlKey && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.closest('#transactionForm')) {
            transactionForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Esc 关闭模态框
    if (e.key === 'Escape') {
        closeEditModal();
    }
});

// 添加触摸滑动删除功能（移动端）
let startX, startY;
let currentTransactionElement = null;

if ('ontouchstart' in window) {
    document.addEventListener('touchstart', function(e) {
        if (e.target.closest('.transaction-item')) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentTransactionElement = e.target.closest('.transaction-item');
        }
    });
    
    document.addEventListener('touchmove', function(e) {
        if (!currentTransactionElement) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = startX - currentX;
        const diffY = startY - currentY;
        
        // 水平滑动且距离足够
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            e.preventDefault();
            currentTransactionElement.style.transform = `translateX(${-diffX}px)`;
            
            if (diffX > 100) {
                currentTransactionElement.style.background = '#ffebee';
            }
        }
    });
    
    document.addEventListener('touchend', function(e) {
        if (!currentTransactionElement) return;
        
        const currentX = e.changedTouches[0].clientX;
        const diffX = startX - currentX;
        
        if (diffX > 100) {
            const id = parseInt(currentTransactionElement.dataset.id);
            deleteTransaction(id);
        } else {
            currentTransactionElement.style.transform = '';
            currentTransactionElement.style.background = '';
        }
        
        currentTransactionElement = null;
    });
}