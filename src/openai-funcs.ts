import {OPENAI_API_KEY} from './api-config';
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

async function fetchGPT3Response(prompt: string) {
	try {
		const completion = await openai.chat.completions.create({
			messages: [{ role: "user", content: prompt}],
			model: "gpt-3.5-turbo",
		  });
        
        let text_response = completion.choices[0].message.content;
        if (text_response?.includes("```python")){
            text_response = text_response.split("```")[1].split("python")[1];
        }
		return completion.choices[0].message.content;

	} catch (error) {
		console.error('Error calling OpenAI API:', error);
		return null;
	}
}

export { fetchGPT3Response };