// 全局变量
let currentTestConfig = {};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    bindEventListeners();
    loadSavedConfig();
});

// 初始化应用
function initializeApp() {
    // 设置当前时间
    setCurrentTime();

    // 每分钟更新一次当前时间
    setInterval(setCurrentTime, 60000);
}

// 绑定事件监听器
function bindEventListeners() {
    // 测试按钮
    document.getElementById('testBtn').addEventListener('click', runTest);

    // 配置相关按钮
    document.getElementById('saveConfigBtn').addEventListener('click', showSaveConfigModal);
    document.getElementById('loadConfigBtn').addEventListener('click', loadSavedConfig);

    // Prompt 相关
    document.getElementById('templateSelect').addEventListener('change', loadTemplate);
    document.getElementById('clearPromptBtn').addEventListener('click', clearPrompt);
    document.getElementById('promptInput').addEventListener('input', updatePromptLength);

    // 时间相关
    document.getElementById('currentTimeBtn').addEventListener('click', setCurrentTime);

    // 模型选择
    document.getElementById('modelSelect').addEventListener('change', handleModelChange);

    // 响应区域按钮
    document.getElementById('copyResponseBtn')?.addEventListener('click', copyResponse);
    document.getElementById('newTestBtn')?.addEventListener('click', newTest);

    // 历史记录
    document.getElementById('refreshHistoryBtn')?.addEventListener('click', refreshHistory);
    document.getElementById('viewAllHistoryBtn')?.addEventListener('click', viewAllHistory);

    // 测试历史项点击
    document.querySelectorAll('.test-item').forEach(item => {
        item.addEventListener('click', () => loadTestFromHistory(item));
    });

    // 模态框
    document.getElementById('closeSaveModal').addEventListener('click', hideSaveConfigModal);
    document.getElementById('cancelSaveConfigBtn').addEventListener('click', hideSaveConfigModal);
    document.getElementById('confirmSaveConfigBtn').addEventListener('click', saveConfig);

    // 点击模态框外部关闭
    document.getElementById('saveConfigModal').addEventListener('click', (e) => {
        if (e.target.id === 'saveConfigModal') {
            hideSaveConfigModal();
        }
    });

    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboard);
}

// 处理键盘快捷键
function handleKeyboard(e) {
    // Ctrl/Cmd + Enter: 运行测试
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runTest();
    }

    // Escape: 关闭模态框
    if (e.key === 'Escape') {
        hideSaveConfigModal();
    }
}

// 运行测试
async function runTest() {
    const testBtn = document.getElementById('testBtn');
    const btnText = testBtn.querySelector('.btn-text');
    const btnLoader = testBtn.querySelector('.btn-loader');

    // 获取表单数据
    const config = getTestConfig();

    // 验证输入
    if (!config.model) {
        showToast('error', '请选择或输入模型名称');
        return;
    }

    if (!config.prompt.trim()) {
        showToast('error', '请输入 Prompt 内容');
        return;
    }

    // 显示加载状态
    testBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-flex';

    try {
        // 发送测试请求
        const response = await fetch('/api/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        if (data.success) {
            // 显示响应
            showResponse(data);

            // 保存当前配置
            currentTestConfig = config;
            saveCurrentConfig();

            // 刷新历史记录
            refreshHistory();

            showToast('success', '测试完成');
        } else {
            showToast('error', data.error || '测试失败');
        }
    } catch (error) {
        console.error('Test error:', error);
        showToast('error', '网络错误：' + error.message);
    } finally {
        // 恢复按钮状态
        testBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// 获取测试配置
function getTestConfig() {
    const modelSelect = document.getElementById('modelSelect').value;
    const customModel = document.getElementById('customModelInput').value;
    const model = customModel || modelSelect;

    return {
        model: model,
        prompt: document.getElementById('promptInput').value,
        type: document.getElementById('typeSelect').value,
        local_time: document.getElementById('timeInput').value,
        local_hour: parseInt(document.getElementById('timeInput').value.split(':')[0]) || null,
        use_mock: document.getElementById('useMockCheckbox').checked
    };
}

// 显示测试响应
function showResponse(data) {
    const responseArea = document.getElementById('responseArea');
    const responseText = document.getElementById('responseText');
    const responseTime = document.getElementById('responseTime');
    const responseModel = document.getElementById('responseModel');
    const mockBadge = document.getElementById('mockBadge');

    // 显示响应内容
    responseText.textContent = data.response;

    // 显示元数据
    responseTime.textContent = `响应时间: ${data.response_time.toFixed(2)}秒`;
    responseModel.textContent = `模型: ${data.model}`;

    // 显示模拟响应标识
    if (data.use_mock) {
        mockBadge.style.display = 'inline-block';
    } else {
        mockBadge.style.display = 'none';
    }

    // 显示响应区域
    responseArea.style.display = 'block';

    // 滚动到响应区域
    responseArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 加载模板
function loadTemplate() {
    const templateId = document.getElementById('templateSelect').value;
    if (!templateId) return;

    // 从模板选择器获取类型
    const selectedOption = document.querySelector(`#templateSelect option[value="${templateId}"]`);
    const templateType = selectedOption?.dataset.type;

    // 这里可以根据模板ID从后端获取模板内容
    // 为了简化，使用预定义的模板
    const templates = {
        'default_urge': {
            type: 'urge',
            content: `你是一个睡眠教练，通过对话帮助用户建立良好的睡眠习惯。

时间信息：
- 用户提供的本地时间：{local_time}
- 已解析的小时（24小时制）：{local_hour}

重要：不要猜测或生成未提供的当前时间；仅根据上面提供或解析到的时间判断。

行为指导：
- 如果已过23:00：用温和但坚定的语气督促用户上床休息
- 如果未到23:00：用关心的语气询问准备情况

其他要求：保持关心、支持的口吻；回复自然简短；不使用Markdown格式。`
        },
        'default_praise': {
            type: 'praise',
            content: `你是一个睡眠教练，任务是通过对话帮助用户改善睡眠习惯。

用户决定现在就去睡觉。请积极鼓励用户的这个决定，称赞他们照顾自己健康的行为，并祝愿他们有个好梦。

保持语气温暖、鼓励。回复要简短，不超过40字。`
        },
        'gentle_reminder': {
            type: 'urge',
            content: '现在已经{local_time}了，夜深了。考虑到您明天还需要精力充沛地工作，建议您开始准备休息。'
        },
        'detailed_guide': {
            type: 'urge',
            content: '现在是{local_time}，让我为您提供一个简单的睡前放松方案：1）调暗房间灯光；2）放下手机；3）做5分钟轻柔伸展；4）喝杯温水。'
        }
    };

    const template = templates[templateId];
    if (template) {
        document.getElementById('promptInput').value = template.content;
        document.getElementById('typeSelect').value = template.type;
        updatePromptLength();
    }
}

// 清空Prompt
function clearPrompt() {
    document.getElementById('promptInput').value = '';
    document.getElementById('templateSelect').value = '';
    updatePromptLength();
}

// 更新Prompt字符计数
function updatePromptLength() {
    const prompt = document.getElementById('promptInput').value;
    document.getElementById('promptLength').textContent = prompt.length;
}

// 设置当前时间
function setCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('timeInput').value = `${hours}:${minutes}`;
}

// 处理模型选择变化
function handleModelChange() {
    const modelSelect = document.getElementById('modelSelect').value;
    const customInput = document.getElementById('customModelInput');

    // 如果选择了预设模型，清空自定义输入
    if (modelSelect) {
        customInput.value = '';
    }
}

// 复制响应内容
function copyResponse() {
    const responseText = document.getElementById('responseText').textContent;

    navigator.clipboard.writeText(responseText).then(() => {
        showToast('success', '响应已复制到剪贴板');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('error', '复制失败');
    });
}

// 新建测试
function newTest() {
    // 隐藏响应区域
    document.getElementById('responseArea').style.display = 'none';

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 聚焦到模型选择框
    document.getElementById('modelSelect').focus();
}

// 保存当前配置
function saveCurrentConfig() {
    const config = getTestConfig();
    localStorage.setItem('sleepTestConfig', JSON.stringify({
        model: config.model,
        type: config.type,
        use_mock: config.use_mock,
        saved_at: new Date().toISOString()
    }));
}

// 加载保存的配置
function loadSavedConfig() {
    const saved = localStorage.getItem('sleepTestConfig');
    if (!saved) return;

    try {
        const config = JSON.parse(saved);

        // 恢复模型选择
        if (config.model) {
            // 检查是否是预设模型
            const modelSelect = document.getElementById('modelSelect');
            const options = Array.from(modelSelect.options);
            const matchingOption = options.find(opt => opt.value === config.model);

            if (matchingOption) {
                modelSelect.value = config.model;
            } else {
                // 作为自定义模型
                document.getElementById('customModelInput').value = config.model;
            }
        }

        // 恢复其他设置
        if (config.type) {
            document.getElementById('typeSelect').value = config.type;
        }

        if (config.use_mock !== undefined) {
            document.getElementById('useMockCheckbox').checked = config.use_mock;
        }

    } catch (error) {
        console.error('Failed to load saved config:', error);
    }
}

// 显示保存配置模态框
function showSaveConfigModal() {
    const modal = document.getElementById('saveConfigModal');
    modal.style.display = 'flex';

    // 聚焦到名称输入框
    setTimeout(() => {
        document.getElementById('configName').focus();
    }, 100);
}

// 隐藏保存配置模态框
function hideSaveConfigModal() {
    document.getElementById('saveConfigModal').style.display = 'none';
    document.getElementById('configName').value = '';
    document.getElementById('configNotes').value = '';
}

// 保存配置
function saveConfig() {
    const name = document.getElementById('configName').value;
    const notes = document.getElementById('configNotes').value;

    if (!name) {
        showToast('error', '请输入配置名称');
        return;
    }

    const config = getTestConfig();

    // 获取已保存的配置列表
    const savedConfigs = JSON.parse(localStorage.getItem('sleepTestConfigs') || '[]');

    // 添加新配置
    savedConfigs.push({
        id: Date.now().toString(),
        name: name,
        notes: notes,
        config: config,
        created_at: new Date().toISOString()
    });

    // 保存到localStorage
    localStorage.setItem('sleepTestConfigs', JSON.stringify(savedConfigs));

    hideSaveConfigModal();
    showToast('success', '配置已保存');
}

// 刷新历史记录
async function refreshHistory() {
    try {
        const response = await fetch('/api/history?page=1&per_page=5');
        const data = await response.json();

        if (data.success) {
            updateHistoryDisplay(data.data);
        }
    } catch (error) {
        console.error('Failed to refresh history:', error);
    }
}

// 更新历史记录显示
function updateHistoryDisplay(tests) {
    const container = document.getElementById('recentTestsList');

    if (!tests || tests.length === 0) {
        container.innerHTML = '<p class="empty-state">暂无测试记录</p>';
        return;
    }

    container.innerHTML = '';

    tests.forEach(test => {
        const testItem = document.createElement('div');
        testItem.className = 'test-item';
        testItem.dataset.id = test.id;

        const timestamp = new Date(test.timestamp).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        testItem.innerHTML = `
            <div class="test-header">
                <span class="test-model">${test.model}</span>
                <span class="test-time">${timestamp}</span>
            </div>
            <div class="test-type">
                <span class="badge ${test.type === 'urge' ? 'badge-info' : 'badge-success'}">
                    ${test.type}
                </span>
                ${test.use_mock ? '<span class="badge badge-warning">模拟</span>' : ''}
            </div>
            <div class="test-preview">
                ${test.response.slice(0, 100)}${test.response.length > 100 ? '...' : ''}
            </div>
        `;

        testItem.addEventListener('click', () => loadTestFromHistory(testItem, test));

        container.appendChild(testItem);
    });
}

// 从历史记录加载测试
function loadTestFromHistory(element, test) {
    if (!test) {
        test = JSON.parse(element.dataset.test) || {};
    }

    // 恢复模型
    if (test.model) {
        const modelSelect = document.getElementById('modelSelect');
        const options = Array.from(modelSelect.options);
        const matchingOption = options.find(opt => opt.value === test.model);

        if (matchingOption) {
            modelSelect.value = test.model;
            document.getElementById('customModelInput').value = '';
        } else {
            document.getElementById('customModelInput').value = test.model;
            modelSelect.value = '';
        }
    }

    // 恢复其他配置
    if (test.type) {
        document.getElementById('typeSelect').value = test.type;
    }

    if (test.local_time) {
        document.getElementById('timeInput').value = test.local_time;
    }

    if (test.use_mock !== undefined) {
        document.getElementById('useMockCheckbox').checked = test.use_mock;
    }

    // 滚动到配置区域
    document.querySelector('.test-config').scrollIntoView({ behavior: 'smooth', block: 'start' });

    showToast('info', '测试配置已加载');
}

// 查看全部历史
function viewAllHistory(e) {
    e.preventDefault();
    // 这里可以实现一个完整的历史页面
    showToast('info', '功能开发中...');
}

// 显示Toast通知
function showToast(type, message, duration = 4000) {
    const toastStack = document.getElementById('toastStack');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');

    const content = document.createElement('div');
    content.className = 'toast__content';
    content.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast__close';
    closeBtn.setAttribute('aria-label', '关闭通知');
    closeBtn.innerHTML = '&times;';

    toast.appendChild(content);
    toast.appendChild(closeBtn);
    toastStack.appendChild(toast);

    let timer = setTimeout(() => {
        hideToast(toast);
    }, duration);

    closeBtn.addEventListener('click', () => {
        clearTimeout(timer);
        hideToast(toast);
    });
}

// 隐藏Toast
function hideToast(toast) {
    toast.classList.add('toast--hiding');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 200);
}