import { useState } from "react";
import { ThesisWritingAgent } from "@/components/agents/ThesisWritingAgent";
import { motion } from "framer-motion";

export default function Home() {
  const [thesis, setThesis] = useState<string>("");

  const handleThesisGenerated = (generatedThesis: string) => {
    setThesis(generatedThesis);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-center text-blue-500 mb-2">
            AI Research Agent
          </h1>
          <p className="text-center text-gray-400">
            Generate comprehensive research theses powered by AI
          </p>
        </motion.div>

        <ThesisWritingAgent onThesisGenerated={handleThesisGenerated} />
      </div>
    </div>
  );
}