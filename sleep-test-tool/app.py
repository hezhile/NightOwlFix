from flask import Flask, render_template, request, jsonify
import httpx
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

# 确保数据目录存在
os.makedirs('data', exist_ok=True)

# 初始化测试历史文件
TEST_HISTORY_FILE = 'data/test_history.json'

def load_test_history():
    """加载测试历史记录"""
    if os.path.exists(TEST_HISTORY_FILE):
        try:
            with open(TEST_HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

def save_test_history(history):
    """保存测试历史记录"""
    with open(TEST_HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

def add_test_record(record):
    """添加测试记录"""
    history = load_test_history()
    record['id'] = str(uuid.uuid4())
    record['timestamp'] = datetime.now().isoformat()
    history.append(record)

    # 只保留最近100条记录
    if len(history) > 100:
        history = history[-100:]

    save_test_history(history)
    return record

@app.route('/')
def index():
    """主页 - 测试界面"""
    # 可用的模型列表
    models = {
        'Cloudflare Workers AI': [
            '@cf/google/gemma-3-12b-it',
            '@cf/meta/llama-3.1-8b-instruct',
            '@cf/mistral/mistral-7b-instruct',
            '@cf/thebloke/codellama-7b-instruct'
        ],
        'OpenAI': [
            'gpt-3.5-turbo',
            'gpt-4',
            'gpt-4-turbo-preview',
            'gpt-4o'
        ],
        'Anthropic Claude': [
            'claude-3-opus',
            'claude-3-sonnet',
            'claude-3-haiku',
            'claude-2.1'
        ],
        '其他模型': [
            'custom-model-1',
            'custom-model-2'
        ]
    }

    # Prompt模板
    prompt_templates = [
        {
            'id': 'default_urge',
            'name': '默认督促模式',
            'type': 'urge',
            'template': '''你是一个睡眠教练，通过对话帮助用户建立良好的睡眠习惯。

时间信息：
- 用户提供的本地时间：{local_time}
- 已解析的小时（24小时制）：{local_hour}

重要：不要猜测或生成未提供的当前时间；仅根据上面提供或解析到的时间判断。

行为指导：
- 如果已过23:00：用温和但坚定的语气督促用户上床休息，避免责备，提供2-3条具体、易执行的放松建议（例如温和伸展、渐进性肌肉放松、4-4-8呼吸法）。
- 如果未到23:00：用关心的语气询问白天的事情是否已完成？是否准备好进行睡前仪式？如果用户尚未完成，给1-2条可行的快速收尾建议，并给1-2条简单的睡前准备建议。

其他要求：始终保持关心、支持的口吻；回复自然简短、不超过100字；不使用Markdown或代码格式；不要提供医学诊断或强制性指令。'''
        },
        {
            'id': 'default_praise',
            'name': '默认表扬模式',
            'type': 'praise',
            'template': '''你是一个睡眠教练，任务是通过对话帮助用户改善睡眠习惯。

用户决定现在就去睡觉。请积极鼓励用户的这个决定，称赞他们照顾自己健康的行为，并祝愿他们有个好梦。

保持语气温暖、鼓励。回复要简短，不超过40字。

重要：不要猜测或生成未提供的当前时间，仅根据下面的已提供时间判断。'''
        },
        {
            'id': 'gentle_reminder',
            'name': '温柔提醒',
            'type': 'urge',
            'template': '现在已经{local_time}了，夜深了。考虑到您明天还需要精力充沛地工作，建议您开始准备休息。可以先做几个深呼吸，放松一下紧张的心情。'
        },
        {
            'id': 'detailed_guide',
            'name': '详细指导',
            'type': 'urge',
            'template': '现在是{local_time}，让我为您提供一个简单的睡前放松方案：1）调暗房间灯光，营造睡眠氛围；2）放下手机，避免蓝光刺激；3）做5分钟轻柔伸展；4）喝杯温水助眠。这样能让您更快进入深度睡眠。'
        }
    ]

    # 加载最近的历史记录
    recent_tests = load_test_history()[-5:]  # 最近5条

    return render_template('index.html',
                         models=models,
                         prompt_templates=prompt_templates,
                         recent_tests=recent_tests)

@app.route('/api/test', methods=['POST'])
def test_endpoint():
    """测试API端点"""
    try:
        data = request.json
        use_mock = data.get('use_mock', False)

        # 获取请求参数
        model = data.get('model', '@cf/google/gemma-3-12b-it')
        prompt = data.get('prompt', '')
        test_type = data.get('type', 'urge')
        local_time = data.get('local_time')
        local_hour = data.get('local_hour')

        # 验证必需参数
        if not prompt:
            return jsonify({
                'success': False,
                'error': 'Prompt 不能为空'
            }), 400

        if use_mock:
            # 使用模拟响应
            response = generate_mock_response(model, test_type, local_time, local_hour)
            response_time = 0.5  # 模拟响应时间
        else:
            # 调用真实API
            start_time = datetime.now()
            response = call_real_api(test_type, local_time, local_hour)
            end_time = datetime.now()
            response_time = (end_time - start_time).total_seconds()

        # 保存测试记录
        test_record = {
            'model': model,
            'prompt': prompt,
            'response': response,
            'type': test_type,
            'local_time': local_time,
            'local_hour': local_hour,
            'use_mock': use_mock,
            'response_time': response_time
        }

        saved_record = add_test_record(test_record)

        return jsonify({
            'success': True,
            'response': response,
            'test_id': saved_record['id'],
            'response_time': response_time,
            'use_mock': use_mock
        })

    except Exception as e:
        app.logger.error(f"Test endpoint error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500

def call_real_api(test_type, local_time=None, local_hour=None):
    """调用真实的Cloudflare Worker API"""
    try:
        # 构建请求体
        payload = {'type': test_type}

        if local_time:
            payload['localTime'] = local_time
        if local_hour is not None:
            payload['localHour'] = local_hour

        # 发送请求
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                'https://sleep.vuntun.app/api/',
                json=payload,
                headers={'Content-Type': 'application/json'}
            )

            if response.status_code == 200:
                data = response.json()
                return data.get('message', '无响应内容')
            else:
                error_msg = f"API请求失败 (状态: {response.status_code})"
                try:
                    error_detail = response.json()
                    if 'error' in error_detail:
                        error_msg += f": {error_detail['error']}"
                except:
                    pass
                raise Exception(error_msg)

    except httpx.TimeoutException:
        raise Exception("API请求超时")
    except httpx.NetworkError as e:
        raise Exception(f"网络错误: {str(e)}")
    except Exception as e:
        raise Exception(f"调用API时出错: {str(e)}")

def generate_mock_response(model, test_type, local_time=None, local_hour=None):
    """生成模拟响应"""
    # 根据模型和类型生成不同风格的响应
    responses = {
        '@cf/google/gemma-3-12b-it': {
            'urge': f'[Gemma模拟] 现在已经{local_time or "深夜"}了，夜深了。考虑到您需要充足的睡眠，建议您开始准备休息。可以先做几个深呼吸，放松一下紧张的心情，有助于更快入睡。',
            'praise': '[Gemma模拟] 做得非常好！决定早睡是对自己健康负责的表现。良好的睡眠会让您明天精力充沛，心情愉快。祝您有个美好的梦！'
        },
        '@cf/meta/llama-3.1-8b-instruct': {
            'urge': f'[Llama模拟] 时间不早了，已经{local_time or "很晚"}。为了您的身心健康，建议您现在放下手中的事情，准备休息。适当的休息能提高明天的工作效率。',
            'praise': '[Llama模拟] 很棒的选择！早睡早起身体好。您正在养成一个健康的生活习惯，这将对您的长期健康大有裨益。晚安！'
        },
        'gpt-4': {
            'urge': f'[GPT-4模拟] 根据时间{local_time or "显示"}，现在是进入睡眠模式的理想时机。我建议您进行一个简短的睡前仪式：调暗灯光、避免电子设备、做一些轻柔的伸展。',
            'praise': '[GPT-4模拟] 极好的决定！ prioritize sleep 是对个人健康和幸福的重要投资。您会注意到明天的认知功能和情绪状态都有显著改善。'
        },
        'claude-3-sonnet': {
            'urge': f'[Claude模拟] 注意到现在是{local_time or "休息时间"}。作为您的睡眠助手，我想提醒您，充足的睡眠对于保持身体和心理健康至关重要。',
            'praise': '[Claude模拟] 我很欣赏您选择现在休息。这种自觉的睡眠习惯展现了您的智慧和对健康的重视。您会为此感到满意的。'
        }
    }

    # 获取对应模型的响应，如果没有则使用默认响应
    model_responses = responses.get(model, responses.get('@cf/google/gemma-3-12b-it'))
    default_response = model_responses.get(test_type, '[默认模拟] 该休息了，晚安！')

    # 如果提供了时间，替换响应中的时间占位符
    if local_time:
        default_response = default_response.replace('{local_time}', local_time)

    return default_response

@app.route('/api/history')
def get_history():
    """获取测试历史"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        history = load_test_history()

        # 分页
        start = (page - 1) * per_page
        end = start + per_page
        paginated_history = history[start:end]

        # 反向排序（最新的在前）
        paginated_history.reverse()

        return jsonify({
            'success': True,
            'data': paginated_history,
            'total': len(history),
            'page': page,
            'per_page': per_page,
            'pages': (len(history) + per_page - 1) // per_page
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/templates')
def get_templates():
    """获取Prompt模板"""
    try:
        templates = [
            {
                'id': 'custom_urge',
                'name': '自定义督促',
                'type': 'urge',
                'template': '现在是{local_time}，提醒用户该休息了。'
            },
            {
                'id': 'custom_praise',
                'name': '自定义表扬',
                'type': 'praise',
                'template': '表扬用户决定早睡。'
            }
        ]

        return jsonify({
            'success': True,
            'data': templates
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # 创建初始化的空历史文件
    if not os.path.exists(TEST_HISTORY_FILE):
        save_test_history([])

    print("启动睡眠API测试工具...")
    print("访问地址: http://localhost:5001")
    print("-" * 50)

    app.run(debug=True, host='0.0.0.0', port=5001)