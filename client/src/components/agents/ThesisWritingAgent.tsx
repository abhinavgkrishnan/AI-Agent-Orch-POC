import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PenTool, FileText, Download, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import { Document, Paragraph, Packer } from "docx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ThesisWritingAgentProps {
  onThesisGenerated: (thesis: string) => void;
}

export function ThesisWritingAgent({
  onThesisGenerated,
}: ThesisWritingAgentProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [thesis, setThesis] = useState("");
  const [topic, setTopic] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [showSources, setShowSources] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const generatePDF = (content: string) => {
    try {
      const pdf = new jsPDF();
      const splitTitle = content.split("\n")[0];
      const mainContent = content.split("\n").slice(1).join("\n");

      pdf.setFont("times", "bold");
      pdf.setFontSize(16);
      const titleLines = pdf.splitTextToSize(splitTitle, 170);
      let yPosition = 20;

      titleLines.forEach((line: string) => {
        pdf.text(line, 20, yPosition);
        yPosition += 10;
      });

      pdf.setFont("times", "normal");
      pdf.setFontSize(12);

      const textLines = pdf.splitTextToSize(mainContent, 170);

      textLines.forEach((line: string) => {
        if (yPosition >= 280) {
          pdf.addPage();
          yPosition = 20;
        }
        if (line.trim()) {
          if (line.startsWith("##")) {
            pdf.setFont("times", "bold");
            pdf.text(line.replace("##", "").trim(), 20, yPosition);
            pdf.setFont("times", "normal");
          } else {
            pdf.text(line, 20, yPosition);
          }
          yPosition += 7;
        }
      });

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      const pdfBlob = pdf.output("blob");
      const newPdfUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(newPdfUrl);

      return pdfBlob;
    } catch (error) {
      console.error("PDF generation error:", error);
      throw error;
    }
  };

  const generateThesis = async () => {
    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a research topic",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setThesis("");
    setPdfUrl("");
    setSources([]); // Reset sources
    try {
      console.log("Sending request to generate thesis for topic:", topic);
      const response = await fetch("/api/generate-thesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      console.log("Response status:", response);
      if (!response.ok) throw new Error("Failed to generate thesis");

      const reader = response.body?.getReader();
      let accumulatedThesis = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.trim().startsWith("data: ")) {
              try {
                const parsedData = JSON.parse(line.replace("data: ", ""));
                console.log("Parsed data:", parsedData);

                if (parsedData.sources) {
                  setSources(parsedData.sources);
                }

                if (parsedData.response) {
                  accumulatedThesis += parsedData.response;
                  setThesis(accumulatedThesis);
                }
              } catch (e) {
                console.error("Error parsing line:", e);
              }
            }
          }
        }
      }

      try {
        generatePDF(accumulatedThesis);
      } catch (error) {
        console.error("PDF generation failed:", error);
        toast({
          title: "Warning",
          description:
            "PDF preview failed, but thesis was generated successfully",
          variant: "destructive",
        });
      }

      onThesisGenerated(accumulatedThesis);
      toast({
        title: "Success",
        description: "Successfully generated research thesis",
      });
    } catch (error) {
      console.error("API error:", error);
      toast({
        title: "Error",
        description: "Failed to generate thesis",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!thesis) return;

    try {
      const pdfBlob = generatePDF(thesis);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${topic.toLowerCase().replace(/\s+/g, "-")}-thesis.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Thesis downloaded as PDF",
      });
    } catch (error) {
      console.error("PDF download error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const downloadDOCX = () => {
    if (!thesis) return;

    try {
      const sections = thesis.split("\n\n");
      const children: Paragraph[] = [];

      sections.forEach((section) => {
        const trimmed = section.trim();
        if (!trimmed) return;

        if (trimmed.startsWith("##")) {
          children.push(
            new Paragraph({
              text: trimmed.replace("##", "").trim(),
              heading: "Heading1",
              spacing: { before: 200, after: 100 },
            }),
          );
        } else {
          // For each line in the section
          trimmed.split("\n").forEach((line) => {
            if (line.trim()) {
              children.push(
                new Paragraph({
                  text: line.trim(),
                  spacing: { before: 100, after: 100 },
                }),
              );
            }
          });
        }
      });

      const doc = new Document({
        sections: [
          {
            children: children,
            properties: {},
          },
        ],
      });

      Packer.toBlob(doc).then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${topic.toLowerCase().replace(/\s+/g, "-")}-thesis.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Thesis downloaded as DOCX",
        });
      });
    } catch (error) {
      console.error("DOCX generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate DOCX",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-200">
            <PenTool className="w-5 h-5" />
            Research Thesis Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Input
              placeholder="Enter your research topic..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="border-gray-700 bg-gray-800/50 text-gray-100"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={generateThesis}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1 min-w-[200px]"
              >
                {isGenerating ? (
                  "Generating Thesis..."
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Thesis
                  </>
                )}
              </Button>
              {thesis && (
                <>
                  <Button
                    onClick={downloadPDF}
                    className="bg-gray-700 hover:bg-gray-600 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button
                    onClick={downloadDOCX}
                    className="bg-gray-700 hover:bg-gray-600 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    DOCX
                  </Button>
                  <Button
                    onClick={() => setShowSources(true)}
                    className="bg-gray-700 hover:bg-gray-600 text-white"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Sources
                  </Button>
                </>
              )}
            </div>
          </div>

          {pdfUrl && (
            <div className="w-full h-[600px] rounded-lg border border-gray-800 overflow-hidden">
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full"
                title="Generated Thesis PDF"
              >
                <p>
                  Unable to display PDF.{" "}
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                    Click here to download instead
                  </a>
                </p>
              </object>
            </div>
          )}

          <Dialog open={showSources} onOpenChange={setShowSources}>
            <DialogContent className="sm:max-w-[600px] bg-gray-900 text-gray-100">
              <DialogHeader>
                <DialogTitle>Research Sources</DialogTitle>
              </DialogHeader>
              <div className="mt-4 max-h-[400px] overflow-y-auto space-y-4">
                {sources.length > 0 ? (
                  sources.map((source, index) => (
                    <div key={index} className="p-4 bg-gray-800 rounded-lg">
                      <p className="whitespace-pre-wrap text-sm text-gray-200">
                        {source}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center">
                    No sources available for this thesis.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
