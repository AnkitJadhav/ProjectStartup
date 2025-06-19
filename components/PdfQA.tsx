'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Send, Loader2, Upload, Brain, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { API_URL } from '@/lib/config'

export default function PdfQA() {
  const [file, setFile] = useState<File | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPdfLoaded, setIsPdfLoaded] = useState(false)
  const [messages, setMessages] = useState<Array<{type: 'user' | 'bot', content: string}>>([])
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
      const response = await fetch(`${API_URL}/upload`, {
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
        setMessages([{ type: 'bot', content: `I've successfully processed "${file.name}". Ask me anything about it!` }])
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
    setMessages(prev => [...prev, { type: 'user', content: question }])
    
    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      })

      const data = await response.json()

      if (data.success) {
        setMessages(prev => [...prev, { type: 'bot', content: data.answer }])
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
      setQuestion('')
    }
  }

  return (
    <div className="container flex justify-center items-center px-4">
      <div className="w-full max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {!isPdfLoaded ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="shine card-hover"
            >
              <Card className="border-2 border-dashed transition-all hover:border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Upload Your PDF
                  </CardTitle>
                  <CardDescription>
                    Drag and drop your PDF or click to browse
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleUpload}
                      disabled={!file || isLoading}
                      className="relative overflow-hidden group"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="ml-2">Processing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span className="ml-2">Upload</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="glass-effect shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Chat Interface
                  </CardTitle>
                  <CardDescription>
                    Ask questions about your PDF document
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Messages */}
                  <div className="space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto p-4 rounded-lg bg-muted/50">
                    <AnimatePresence initial={false}>
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "flex items-start gap-3 rounded-lg p-4",
                            message.type === 'user' ? "ml-auto bg-primary text-primary-foreground max-w-[80%]" : "bg-muted max-w-[80%]"
                          )}
                        >
                          {message.type === 'user' ? (
                            <User className="h-5 w-5 mt-1" />
                          ) : (
                            <Bot className="h-5 w-5 mt-1" />
                          )}
                          <div className="prose dark:prose-invert">
                            {message.content.split('\n').map((line, i) => (
                              <p key={i} className="m-0">{line}</p>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask a question..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAskQuestion}
                      disabled={!question.trim() || isLoading}
                      className="relative overflow-hidden group"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="ml-2">Processing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span className="ml-2">Ask</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                  {file && <span>Current PDF: {file.name}</span>}
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 