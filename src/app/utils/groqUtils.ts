import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface ChatMessage {
  role: "assistant" | "user" | "system";
  content: string;
}

export async function GetGroqResponse(chatMessages: ChatMessage[]) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are an expert academic researcher. You always cite your sources and base your responses only on the sources you have been provided with.",
    },
    ...chatMessages
  ];

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages,
  });

  return response.choices[0].message.content;
}
