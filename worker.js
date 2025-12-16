export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Only handle POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    try {
      // Parse the incoming request body
      const requestBody = await request.json();

      // Get the prompt type (default to 'urge' for backward compatibility)
      const type = requestBody.type || 'urge';

      // Validate request body structure
      if (!requestBody.localTime) {
        return new Response(JSON.stringify({
          error: 'Invalid request body: localTime field is required'
        }), {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        });
      }
      // Sanitize and limit the incoming localTime string to avoid very long or control characters
      let localTimeRaw = String(requestBody.localTime);
      // Remove newlines and backticks to keep the prompt safe and one-line friendly
      let localTimeSafe = localTimeRaw.replace(/[\n\r`]/g, ' ').trim();
      if (localTimeSafe.length > 100) localTimeSafe = localTimeSafe.slice(0, 100);

      // Try to parse an hour from the provided localTime.
      // Support ISO timestamps (new Date(...)) or "HH:mm" style strings.
      let hour = null;
      const dt = new Date(localTimeRaw);
      if (!isNaN(dt.getTime())) {
        hour = dt.getHours();
      } else {
        const match = localTimeRaw.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
          hour = Number(match[1]);
          if (isNaN(hour) || hour < 0 || hour > 23) hour = null;
        }
      }

      // Build prompt safely
      let prompt;
      if (type === 'praise') {
        prompt = `你是一个睡眠教练，任务是通过对话帮助用户改善睡眠习惯。用户决定现在就去睡觉。
          请积极鼓励用户的这个决定，称赞他们照顾自己健康的行为，并祝愿他们有个好梦。保持语气温暖、鼓励。回复要简短，不超过40字。`;
      } else {
        const timePart = localTimeSafe ? `用户的本地时间是：${localTimeSafe}。` : '';
        const behaviorPart = (hour !== null)
          ? (hour >= 23
             ? "当前时间已过23:00：用温和但坚定的语气督促用户上床休息，避免责备，提供2–3条具体、易执行的放松建议（例如温和伸展、渐进性肌肉放松、4-4-8呼吸法）。"
              : "当前时间未到23:00：用关心的语气询问白天的事情是否已完成？是否准备好进行睡前仪式？如果用户尚未完成，给1–2条可行的快速收尾建议（例如列出3项优先任务、设定5分钟计时器），并给1–2条简单的睡前准备建议（例如关灯、关屏、深呼吸）。")
          : "无法确定用户本地时间：温和询问用户现在是否准备睡觉，并提供通用睡前建议。";

        prompt = [
          "你是一个睡眠教练，通过对话帮助用户建立良好的睡眠习惯。",
          timePart,
          behaviorPart,
          "其他要求：始终保持关心、支持的口吻；回复自然简短、不超过100字；不使用Markdown或代码格式；不要提供医学诊断或强制性指令。"
          ].join(' ');

      // Use Cloudflare Worker AI without streaming
      const answer = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        prompt: prompt,
        stream: false
      });

      // 修复：返回 message 字段而不是 response
      return new Response(JSON.stringify({ message: answer.response }), {
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json" 
        }
      });

    } catch (error) {
      console.error('Error in Cloudflare Worker:', error);
      
      // Handle any errors
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack 
      }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }
  }
};