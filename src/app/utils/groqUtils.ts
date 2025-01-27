import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
})

export async function GetGroqResponse(message: string){
    interface ChatMessage {
        role: "assistant" | "user" | "system",
        content: string
    }
    const messages: ChatMessage[] = [
        {
            role : "system",
            content: "You are an expert academic researcher. You always cite your sources and base your responses only on the sources you have been provided with."
        },
        {
            role: "user",
            content : message
        }
    ];

    const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages
    })

    return response.choices[0].message.content;
}