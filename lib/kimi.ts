import OpenAI from "openai";

type KimiConfig = {
  model?: string;
  temperature?: number;
};

type KimiResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY || "";
const MOONSHOT_BASE_URL =
  process.env.MOONSHOT_BASE_URL || "https://api.moonshot.ai/v1";
const MOONSHOT_MODEL = process.env.MOONSHOT_MODEL || "kimi-k2.5";

export const hasKimiApiKey = () => Boolean(MOONSHOT_API_KEY.trim());

export class KimiTextModel {
  private readonly client: OpenAI;

  constructor(
    private readonly config: {
      model: string;
      temperature: number;
    },
  ) {
    this.client = new OpenAI({
      apiKey: MOONSHOT_API_KEY,
      baseURL: MOONSHOT_BASE_URL,
    });
  }

  async generateContent(prompt: string) {
    const completion = (await this.client.chat.completions.create({
      model: this.config.model,
      temperature: this.config.temperature,
      messages: [
        {
          role: "system",
          content:
            "You are a slide-generation expert. Improve the input when needed, but return only valid JSON that matches the requested schema.",
        },
        { role: "user", content: prompt },
      ],
    })) as KimiResponse;

    const content = completion.choices?.[0]?.message?.content ?? "";

    if (!content.trim()) {
      throw new Error("Kimi returned an empty response");
    }

    return {
      response: {
        text: () => content,
      },
    };
  }
}

export const getKimiSlideModel = (config?: KimiConfig) => {
  if (!hasKimiApiKey()) {
    throw new Error(
      "No Moonshot API key configured. Set MOONSHOT_API_KEY in .env.local",
    );
  }

  return new KimiTextModel({
    model: config?.model || MOONSHOT_MODEL,
    temperature: config?.temperature ?? 0.2,
  });
};
