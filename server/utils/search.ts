import type { SerperResponse } from "./types";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export async function searchWithSerper(query: string): Promise<string[]> {
  console.log("SERPER_API_KEY:", process.env.SERPER_API_KEY);
  if (!process.env.SERPER_API_KEY) {
    throw new Error("SERPER_API_KEY is required for data collection");
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 10, // Number of results to fetch
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.statusText}`);
    }

    const data: SerperResponse = await response.json();

    // Extract relevant information from organic search results
    const results = data.organic.map((result) => {
      return `Title: ${result.title}\nSnippet: ${result.snippet}\nLink: ${result.link}\n\n`;
    });

    return results;
  } catch (error) {
    console.error("Serper API error:", error);
    throw error;
  }
}
