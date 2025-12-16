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

      // Use Cloudflare Worker AI without streaming
      let prompt;
      if (type === 'praise') {
        prompt = `你是一个睡眠教练，任务是通过对话帮助用户改善睡眠习惯。用户决定现在就去睡觉。请积极鼓励用户的这个决定，称赞他们照顾自己健康的行为，并祝愿他们有个好梦。保持语气温暖、鼓励。回复要简短，不超过40字。`;
      } else {
        prompt = ["你是一个睡眠教练，通过对话帮助用户建立良好的睡眠习惯。",
          "可用变量：requestBody.localTime（本地时间），可选requestBody.localTime（本地时间），",
          "行为规范：如果当前时间还没到23:00：用关心的语气询问白天的事情是否已完成？是否准备好进行睡前仪式？.",
          "同时给1–2条简单的睡前准备建议（例如关灯、关屏、深呼吸）。",
          "如果当前时间已过23:00：用温和但坚定的语气督促用户上床休息，避免责备，提供2–3条具体、易执行的放松建议（例如温和伸展、渐进性肌肉放松、4-4-8呼吸法）。",
          "其他要求：始终保持关心、支持的口吻；回复自然简短、不超过100字；不使用Markdown或代码格式；不要提供医学诊断或强制性指令；不要在回复中描述你是如何判断时间的。"].join(' ');
      }
      
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