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
          'Content-Type': 'application/json',
        },
      });
    }

    try {
      // Parse the incoming request body
      const requestBody = await request.json();

      // Get the prompt type (default to 'urge' for backward compatibility)
      const type = requestBody.type || 'urge';

      // Require at least one time-related field (localHour, iso, or localTime)
      if (typeof requestBody.localHour === 'undefined' && !requestBody.iso && !requestBody.localTime) {
        return new Response(
          JSON.stringify({
            error: 'Invalid request body: provide localHour or iso or localTime',
          }),
          {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // Normalize inputs
      const rawLocalHour = requestBody.localHour;
      const rawIso = requestBody.iso;
      const rawLocalTime = typeof requestBody.localTime === 'string' ? requestBody.localTime : (requestBody.localTime ? String(requestBody.localTime) : '');

      // Build a safe display string for the prompt (sanitized & length-limited)
      let localTimeSafe = '';
      if (rawLocalTime) {
        localTimeSafe = rawLocalTime.replace(/[\n\r`]/g, ' ').trim().slice(0, 100);
      } else if (rawIso) {
        localTimeSafe = String(rawIso).slice(0, 100);
      } else if (typeof rawLocalHour === 'number') {
        localTimeSafe = String(rawLocalHour).padStart(2, '0') + ':00';
      }

      // Parse hour (priority: localHour -> iso -> "HH:mm" -> "HHmm")
      let hour = null;
      if (typeof rawLocalHour === 'number' && Number.isInteger(rawLocalHour) && rawLocalHour >= 0 && rawLocalHour <= 23) {
        hour = rawLocalHour;
      } else if (rawIso) {
        const d = new Date(rawIso);
        if (!isNaN(d.getTime())) {
          hour = d.getHours();
        }
      } else if (rawLocalTime) {
        const s = rawLocalTime.trim();
        // match "HH:mm" or "H:mm" or "HH:mm:ss"
        let m = s.match(/^(\d{1,2}):/);
        if (m) {
          const h = Number(m[1]);
          if (!isNaN(h) && h >= 0 && h <= 23) hour = h;
        } else {
          // match "HHmm" or "Hmmm" e.g., 1635 or 835
          m = s.match(/^(\d{1,2})(\d{2})$/);
          if (m) {
            const h = Number(m[1]);
            if (!isNaN(h) && h >= 0 && h <= 23) hour = h;
          }
        }
      }

      // Construct prompt safely and explicitly instruct model not to invent current time
      let prompt;
      if (type === 'praise') {
        prompt = [
          '你是一个睡眠教练，任务是通过对话帮助用户改善睡眠习惯。',
          '用户决定现在就去睡觉。请积极鼓励用户的这个决定，称赞他们照顾自己健康的行为，并祝愿他们有个好梦。',
          '保持语气温暖、鼓励。回复要简短，不超过40字。',
          '重要：不要猜测或生成未提供的当前时间，仅根据下面的已提供时间判断。'
        ].join(' ');
      } else {
        const timePart = localTimeSafe ? `用户提供的本地时间：${localTimeSafe}。` : '用户未提供可解析的本地时间。';
        const hourPart = hour !== null ? `已解析的小时（24小时制）：${hour}。` : '无法解析具体小时。';

        const behaviorPart =
          hour !== null
            ? (hour >= 23
                ? '已过23:00：用温和但坚定的语气督促用户上床休息，避免责备，提供2–3条具体、易执行的放松建议（例如温和伸展、渐进性肌肉放松、4-4-8呼吸法）。'
                : '未到23:00：用关心的语气询问白天的事情是否已完成？是否准备好进行睡前仪式？如果用户尚未完成，给1–2条可行的快速收尾建议，并给1–2条简单的睡前准备建议。')
            : '无法确定用户本地时间：温和询问用户现在是否准备睡觉，并提供通用、简短的睡前建议（不要猜测具体时刻）。';

        prompt = [
          '<s>[INST]你是一个睡眠教练，通过对话帮助用户建立良好的睡眠习惯。[/INST]</s>',
          timePart,
          hourPart,
          '重要：不要猜测或生成未提供的当前时间；仅根据上面提供或解析到的时间判断。',
          behaviorPart,
          '其他要求：始终保持关心、支持的口吻；回复自然简短、不超过100字；不使用Markdown或代码格式；不要提供医学诊断或强制性指令。'
        ].join(' ');
      }

      // Optionally set temperature to reduce creative "猜测" if the API supports it.
      // If your env.AI.run does not accept temperature, you can remove it.
      const aiOptions = {
        prompt: prompt,
        stream: false,
        // temperature: 0, // uncomment if supported to reduce hallucinations
      };

      const answer = await env.AI.run('@cf/google/gemma-3-12b-it', aiOptions);

      // Normalize model output: try common fields, fallback to stringified answer
      const modelText =
        (answer && (answer.response || answer.output || answer.output_text || answer.text)) ||
        (typeof answer === 'string' ? answer : JSON.stringify(answer));

      return new Response(JSON.stringify({ message: String(modelText) }), {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error in Cloudflare Worker:', error);

      // Handle any errors
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error && error.message ? error.message : String(error),
        }),
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};