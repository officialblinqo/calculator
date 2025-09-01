// netlify/functions/proxy.js

export async function handler(event, context) {
  try {
    const API_KEY = process.env.API_KEY; // 🔒 stored in Netlify env

    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key not set on server" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    // forward the payload (prompt, equation, image, etc.) to Gemini
    const response = await fetch(
      https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY},
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    return {
      statusCode: response.status,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}