// 睡眠配置测试脚本
// 在浏览器控制台中运行此脚本来测试功能

console.log('=== 睡眠配置功能测试 ===');

// 测试1: 检查变量是否正确初始化
console.log('1. 检查全局变量:');
console.log('sleepDayStartHour:', typeof sleepDayStartHour, sleepDayStartHour);
console.log('selectedSleepConfig:', typeof selectedSleepConfig, selectedSleepConfig);

// 测试2: 测试getSleepDate函数
console.log('\n2. 测试getSleepDate函数:');

// 创建测试时间
const testTimes = [
    new Date(2025, 11, 14, 3, 0),  // 凌晨3点
    new Date(2025, 11, 14, 7, 0),  // 早上7点
    new Date(2025, 11, 14, 15, 0), // 下午3点
    new Date(2025, 11, 14, 23, 0)  // 晚上11点
];

// 保存原始配置
const originalHour = sleepDayStartHour;

// 测试不同的睡眠日开始时间
const testConfigs = [4, 6, 9, 12];

testConfigs.forEach(configHour => {
    console.log(`\n--- 测试睡眠日 ${configHour}:00 开始 ---`);
    sleepDayStartHour = configHour;

    testTimes.forEach(time => {
        const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const sleepDate = getSleepDate(time);
        console.log(`${timeStr} -> ${sleepDate}`);
    });
});

// 恢复原始配置
sleepDayStartHour = originalHour;

// 测试3: 测试重置时间计算
console.log('\n3. 测试重置时间计算:');
testConfigs.forEach(configHour => {
    sleepDayStartHour = configHour;
    const resetHour = (sleepDayStartHour + 4) % 24;
    console.log(`睡眠日 ${configHour}:00 开始 -> 重置时间 ${resetHour}:00`);
});

// 恢复原始配置
sleepDayStartHour = originalHour;

// 测试4: 测试UI元素
console.log('\n4. 测试UI元素:');
const settingsBtn = document.getElementById('settingsBtn');
const configModal = document.getElementById('sleepConfigModal');
const welcomeModal = document.getElementById('welcomeModal');
const statusDiv = document.getElementById('sleepDayStatus');

console.log('设置按钮:', settingsBtn ? '存在' : '缺失');
console.log('配置模态框:', configModal ? '存在' : '缺失');
console.log('欢迎模态框:', welcomeModal ? '存在' : '缺失');
console.log('状态显示:', statusDiv ? '存在' : '缺失');

// 测试5: 测试localStorage
console.log('\n5. 测试localStorage:');
console.log('hasConfiguredSleepTime:', localStorage.getItem('hasConfiguredSleepTime'));
console.log('sleepDayStartHour配置:', localStorage.getItem('sleepDayStartHour'));

console.log('\n=== 测试完成 ===');