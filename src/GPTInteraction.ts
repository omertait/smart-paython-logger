import { OPENAI_API_KEY } from './api-config';
import OpenAI from 'openai';
import { parseCode } from './response-handler';

interface Message {
    role: 'user' | 'assistant';
    content: string | null;
}

class GPTInteraction {
    private openai: OpenAI;
    private messages: Message[];
	private readonly maxTokenCount = 4095;
    private readonly tokenBuffer = 120;
	private currentTokenCount: number;
	private readonly avgCharPerToken: number = 4; // Average characters per token

    constructor() {
        this.openai = new OpenAI({ apiKey : OPENAI_API_KEY });
        this.messages = [];
		this.currentTokenCount = 0;
    }

    async fetchGPT3Response(prompt: string): Promise<string | null> {
        try {
            const userMessage: Message = { role: 'user', content: prompt };
            this.messages.push(userMessage);
			this.currentTokenCount += Math.ceil(prompt.length / this.avgCharPerToken);

            const completion = await this.openai.chat.completions.create({
                messages: this.messages,
                model: 'gpt-3.5-turbo',
            });

			let textResponse = completion.choices[0].message.content;
			
			if (textResponse === null) {
				throw new Error('OpenAI API returned null response');
			}
			
			textResponse = parseCode(textResponse);
			
			
			// keep track of the current token count
			const estimatedResponseTokenCount = Math.ceil(textResponse.length / this.avgCharPerToken);
            const availableTokens = this.maxTokenCount - this.currentTokenCount - this.tokenBuffer;

            // openai api has a limit on the number of tokens per request
            // if the response is too long, remove the last message from the messages array
            if (estimatedResponseTokenCount > availableTokens) {
                // remove the last message from the messages array if its not the first message
				if (this.messages.length > 1) {
					this.messages.pop();
				}
				else { // if its the first response - dont save it
					return textResponse;
				}
            }
			
			const assistantMessage: Message = { role: 'assistant', content: textResponse };
			// push the assistant message to the messages array
			this.messages.push(assistantMessage);
			//this.messages.push(assistantMessage);
            return textResponse;

        } catch (error) {
            console.error('Error calling OpenAI API:', error);
            return null;
        }
    }

    getMessages(): Message[] {
        return this.messages;
    }

    clearMessages(): void {
        this.messages = [];
    }
}

export { GPTInteraction };
