'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function PdfQA() {
  const [file, setFile] = useState<File | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPdfLoaded, setIsPdfLoaded] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive"
        })
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "PDF uploaded successfully",
        })
        setIsPdfLoaded(true)
      } else {
        throw new Error(data.error || 'Failed to upload PDF')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload PDF",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAskQuestion = async () => {
    if (!question.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:5000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      })

      const data = await response.json()

      if (data.success) {
        setAnswer(data.answer)
      } else {
        throw new Error(data.error || 'Failed to get answer')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get answer",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>PDF Question & Answer System</CardTitle>
          <CardDescription>Upload a PDF and ask questions about its content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* PDF Upload Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Upload PDF</label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isLoading || isPdfLoaded}
              />
              <Button
                onClick={handleUpload}
                disabled={!file || isLoading || isPdfLoaded}
              >
                {isLoading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>

          {/* Question Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Ask a Question</label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type your question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!isPdfLoaded || isLoading}
              />
              <Button
                onClick={handleAskQuestion}
                disabled={!question.trim() || !isPdfLoaded || isLoading}
              >
                {isLoading ? "Processing..." : "Ask"}
              </Button>
            </div>
          </div>

          {/* Answer Section */}
          {answer && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Answer</label>
              <Textarea
                value={answer}
                readOnly
                className="min-h-[200px]"
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="text-sm text-gray-500">
          {isPdfLoaded ? "PDF loaded and ready for questions" : "Please upload a PDF file first"}
        </CardFooter>
      </Card>
    </div>
  )
} 