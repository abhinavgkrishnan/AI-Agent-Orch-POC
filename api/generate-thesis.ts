import { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

interface SerperResponse {
  organic: Array<{
    title: string;
    link: string;
    snippet: string;
    position?: number;
    publicationInfo?: string;
    year?: number;
    citedBy?: number;
    pdfUrl?: string;
    id?: string;
  }>;
  searchParameters: {
    q: string;
    gl?: string;
    hl?: string;
    type?: string;
    engine?: string;
  };
}

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

export async function searchWithSerperScholar(query: string): Promise<string[]> {
  console.log("SERPER_API_KEY:", process.env.SERPER_API_KEY);
  if (!process.env.SERPER_API_KEY) {
    throw new Error("SERPER_API_KEY is required for data collection");
  }

  try {
    const response = await fetch("https://google.serper.dev/scholar", {
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
      return `Title: ${result.title}\nSnippet: ${result.snippet}\nLink: ${result.link}\nPublication Info: ${result.publicationInfo}\nYear: ${result.year}\nCited By: ${result.citedBy}\nPDF URL: ${result.pdfUrl}\n\n`;
    });

    return results;
  } catch (error) {
    console.error("Serper API error:", error);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic } = req.body;

  try {
    console.log("Received request to generate thesis for topic:", topic);
    console.log("Environment Variables:");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("SERPER_API_KEY:", process.env.SERPER_API_KEY);

    if (!process.env.SERPER_API_KEY) {
      throw new Error("SERPER_API_KEY is not set");
    }

    // Collect real data using Serper API
    const searchResults = await searchWithSerper(topic);
    const scholarResults = await searchWithSerperScholar(topic);
    console.log("Search results:", searchResults);
    console.log("Scholar results:", scholarResults);

    const collectedData = [...searchResults, ...scholarResults].join("\n");

    // Use LLM to analyze and synthesize the collected data
    const dataAnalysisResponse = await fetch(
      "https://api-user.ai.aitech.io/api/v1/user/products/3/use/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization:
            "Bearer eDsBy2D9vSFWtXZBEAHTPqrvMm7BJqTe2LJ4BhsUHVECir28rKq6dPLK2k7sScQb",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a research data analysis agent. Your task is to:
              1. Analyze the provided search results
              2. Extract key findings and statistics
              3. Identify main themes and patterns
              4. Note conflicting information or debates
              5. Organize the information into a structured format

              Format the output as a structured research summary with proper citations.`,
            },
            {
              role: "user",
              content: `Analyze these search results about ${topic}:\n\n${collectedData}`,
            },
          ],
          model: "Meta-Llama-3.1-70B-Instruct",
          stream: false,
          max_tokens: 2000,
          temperature: 0.7,
        }),
      },
    );

    console.log("Data analysis response status:", dataAnalysisResponse.status);
    if (!dataAnalysisResponse.ok) {
      throw new Error(
        `Data analysis failed with status ${dataAnalysisResponse.status}`,
      );
    }

    const analysisResult = await dataAnalysisResponse.json();
    console.log("Data analysis result:", analysisResult);

    const structuredData = analysisResult.choices[0].message.content;

    // Generate the final thesis using the structured data
    const thesisResponse = await fetch(
      "https://api-user.ai.aitech.io/api/v1/user/products/3/use/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization:
            "Bearer eDsBy2D9vSFWtXZBEAHTPqrvMm7BJqTe2LJ4BhsUHVECir28rKq6dPLK2k7sScQb",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a professional academic thesis writer. Generate a focused, coherent research thesis.
              Follow APA style for citations and references.
              Do not repeat content. Do not leave sections incomplete.

              Output Format:
              # [Title]

              ## Abstract
              [A clear, concise overview of the research - max 200 words]

              ## Introduction
              [Background and context]
              [Research objectives]
              [Significance]

              ## Methodology
              [Research approach]
              [Data sources]
              [Analysis methods]

              ## Results
              [Key findings with specific data points]
              [Analysis of trends]

              ## Discussion
              [Interpretation of results]
              [Implications]
              [Recommendations]

              ## Conclusion
              [Summary]
              [Future directions]

              ## References
              [Numbered list of citations]`,
            },
            {
              role: "user",
              content: `Based on this analyzed research data:\n\n${structuredData}\n\nGenerate a comprehensive thesis about: ${topic}`,
            },
          ],
          model: "Meta-Llama-3.1-70B-Instruct",
          stream: true,
          max_tokens: 3000,
          temperature: 0.7,
        }),
      },
    );

    console.log("Thesis generation response status:", thesisResponse.status);
    const reader = thesisResponse.body?.getReader();
    if (!reader) {
      throw new Error("No reader available");
    }

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (buffer) {
          try {
            const parsed = JSON.parse(buffer);
            if (parsed.choices?.[0]?.delta?.content) {
              res.write(
                `data: ${JSON.stringify({ response: parsed.choices[0].delta.content, sources: [...searchResults, ...scholarResults] })}\n\n`,
              );
            }
          } catch (e) {
            console.error("Error parsing buffer:", e);
          }
        }
        res.end();
        break;
      }

      const chunk = new TextDecoder().decode(value);
      buffer += chunk;

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim().startsWith("data: ")) {
          const jsonStr = line.slice(6);
          try {
            if (jsonStr === "[DONE]") {
              continue;
            }
            const parsed = JSON.parse(jsonStr);
            if (parsed.choices?.[0]?.delta?.content) {
              const content = parsed.choices[0].delta.content;
              res.write(`data: ${JSON.stringify({ response: content, sources: [...searchResults, ...scholarResults] })}\n\n`);
            }
          } catch (e) {
            console.error("Error parsing JSON:", e);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("API error:", error);
      res
        .status(500)
        .json({ error: "Failed to generate thesis", details: error.message });
    } else {
      console.error("Unexpected error:", error);
      res
        .status(500)
        .json({
          error: "Failed to generate thesis",
          details: "An unexpected error occurred",
        });
    }
  }
}