import OpenAI from "openai";

import { getGenerationModel } from "@/lib/ai-provider";
import { getKimiSlideModel, hasKimiApiKey } from "@/lib/kimi";

export type SlideModelId =
  | "ollama:mistral:latest"
  | "ollama:llama3.1:8b"
  | "kimi:kimi-k2.5"
  | "gemini:gemini-2.5-flash"
  | "openai:gpt-4o-mini";

export const DEFAULT_SLIDE_MODEL: SlideModelId = "ollama:mistral:latest";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

type ModelResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

class OpenAITextModel {
  private readonly client: OpenAI;

  constructor(
    private readonly config: {
      model: string;
      temperature: number;
    },
  ) {
    this.client = new OpenAI({
      apiKey: OPENAI_API_KEY,
      baseURL: OPENAI_BASE_URL,
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
            "You generate production-ready slide JSON. Return only valid JSON matching schema.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    })) as ModelResponse;

    const content = completion.choices?.[0]?.message?.content || "";

    if (!content.trim()) {
      throw new Error("OpenAI slide model returned an empty response");
    }

    return {
      response: {
        text: () => content,
      },
    };
  }
}

const isValidSlideModel = (value: string): value is SlideModelId =>
  [
    "ollama:mistral:latest",
    "ollama:llama3.1:8b",
    "kimi:kimi-k2.5",
    "gemini:gemini-2.5-flash",
    "openai:gpt-4o-mini",
  ].includes(value);

export const normalizeSlideModel = (value?: string | null): SlideModelId => {
  if (!value) return DEFAULT_SLIDE_MODEL;
  return isValidSlideModel(value) ? value : DEFAULT_SLIDE_MODEL;
};

export const getSlideGenerationModel = (input: {
  slideModel?: string | null;
  temperature?: number;
}) => {
  const slideModel = normalizeSlideModel(input.slideModel);
  const temperature = input.temperature ?? 0.2;

  if (slideModel.startsWith("ollama:")) {
    const modelName = slideModel.split(":").slice(1).join(":");
    return getGenerationModel({
      provider: "local-ai",
      model: modelName,
      temperature,
    });
  }

  if (slideModel.startsWith("kimi:")) {
    if (!hasKimiApiKey()) {
      throw new Error("MOONSHOT_API_KEY is required for Kimi slide model");
    }

    const modelName = slideModel.split(":").slice(1).join(":");
    return getKimiSlideModel({
      model: modelName,
      temperature,
    });
  }

  if (slideModel.startsWith("gemini:")) {
    const modelName = slideModel.split(":").slice(1).join(":");
    return getGenerationModel({
      provider: "global-ai",
      model: modelName,
      temperature,
    });
  }

  if (slideModel.startsWith("openai:")) {
    if (!OPENAI_API_KEY.trim()) {
      throw new Error("OPENAI_API_KEY is required for OpenAI slide model");
    }

    const modelName = slideModel.split(":").slice(1).join(":");
    return new OpenAITextModel({
      model: modelName,
      temperature,
    });
  }

  return getGenerationModel({
    provider: "local-ai",
    model: "mistral:latest",
    temperature,
  });
};
