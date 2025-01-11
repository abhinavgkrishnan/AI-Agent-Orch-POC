import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { researchData, agentConfigs } from "@db/schema"; // Import agentConfigs schema
import { searchWithSerper } from "./utils/search";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  app.post("/api/generate-thesis", async (req, res) => {
    const { topic } = req.body;

    try {
      console.log("Received request to generate thesis for topic:", topic);

      // First, collect real data using Serper API
      const searchResults = await searchWithSerper(topic);
      console.log("Search results:", searchResults);

      const collectedData = searchResults.join("\n");

      // Store the collected raw data
      await db.insert(researchData).values({
        topic,
        collectedData: { content: collectedData },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("Stored collected data in database");

      // Send the search results first
      res.write(`data: ${JSON.stringify({ sources: searchResults })}\n\n`);

      // Use LLM to analyze and synthesize the collected data
      const dataAnalysisResponse = await fetch("https://api-user.ai.aitech.io/api/v1/user/products/3/use/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer eDsBy2D9vSFWtXZBEAHTPqrvMm7BJqTe2LJ4BhsUHVECir28rKq6dPLK2k7sScQb",
          "Content-Type": "application/json"
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

                       Format the output as a structured research summary with proper citations.`
            },
            { role: "user", content: `Analyze these search results about ${topic}:\n\n${collectedData}` }
          ],
          model: "Meta-Llama-3.1-70B-Instruct",
          stream: false,
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      console.log("Data analysis response status:", dataAnalysisResponse.status);
      if (!dataAnalysisResponse.ok) {
        throw new Error(`Data analysis failed with status ${dataAnalysisResponse.status}`);
      }

      const analysisResult = await dataAnalysisResponse.json();
      console.log("Data analysis result:", analysisResult);

      const structuredData = analysisResult.choices[0].message.content;

      // Generate the final thesis using the structured data
      const thesisResponse = await fetch("https://api-user.ai.aitech.io/api/v1/user/products/3/use/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer eDsBy2D9vSFWtXZBEAHTPqrvMm7BJqTe2LJ4BhsUHVECir28rKq6dPLK2k7sScQb",
          "Content-Type": "application/json"
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
                       [Numbered list of citations]`
            },
            { role: "user", content: `Based on this analyzed research data:\n\n${structuredData}\n\nGenerate a comprehensive thesis about: ${topic}` }
          ],
          model: "Meta-Llama-3.1-70B-Instruct",
          stream: true,
          max_tokens: 3000,
          temperature: 0.7
        })
      });

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
                res.write(`data: ${JSON.stringify({ response: parsed.choices[0].delta.content })}\n\n`);
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

        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              if (jsonStr === '[DONE]') {
                continue;
              }
              const parsed = JSON.parse(jsonStr);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                res.write(`data: ${JSON.stringify({ response: content })}\n\n`);
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error("API error:", error);
      res.status(500).json({ error: "Failed to generate thesis" });
    }
  });

  app.post("/api/save-config", async (req, res) => {
    const { agentType, config } = req.body;

    try {
      await db.insert(agentConfigs).values({
        agentType,
        prompt: config.prompt,
        settings: config.settings
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  return httpServer;
}
