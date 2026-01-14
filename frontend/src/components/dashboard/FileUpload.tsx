/**
 * File Upload Component with Drag & Drop
 * Functional file-drop zone for LMA PDF uploads
 */
import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle2, Loader2, X } from 'lucide-react';
import { runAIAnalysis, generateLoanFromAnalysis } from '@/lib/ai_backend';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { GreenLoan } from '@/types/greenLoan';
import { toast } from 'sonner';

interface FileUploadProps {
  onUploadComplete?: (loan: GreenLoan) => void;
}

const FileUpload = ({ onUploadComplete }: FileUploadProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { addLoan } = useGreenGaugeStore();

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast.error('Only PDF files are supported');
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      // Run AI analysis (simulation)
      const result = await runAIAnalysis(file);
      
      // Complete progress
      setProgress(100);
      clearInterval(progressInterval);

      // Generate loan data
      const loanData = generateLoanFromAnalysis(result);
      const newLoan: GreenLoan = {
        ...loanData,
        companyName: file.name.replace('.pdf', '').replace(/_/g, ' '),
      } as GreenLoan;

      // Add to store
      addLoan(newLoan);
      
      toast.success(`Successfully extracted ${result.covenants.length} covenants from ${file.name}`);
      
      if (onUploadComplete) {
        onUploadComplete(newLoan);
      }

      // Reset after 2 seconds
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setUploadedFile(null);
      }, 2000);

    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      toast.error('Failed to process document');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onDrop([file]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onDrop([file]);
    }
  };

  return (
    <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center p-8 rounded-lg cursor-pointer
            transition-all duration-200
            ${isDragActive ? 'bg-primary/5 border-primary' : 'bg-muted/30'}
            ${isProcessing ? 'pointer-events-none opacity-50' : 'hover:bg-muted/50'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isProcessing}
          />
          
          {isProcessing ? (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-semibold mb-2">Parsing LMA Clauses...</p>
              <p className="text-sm text-muted-foreground mb-4">
                AI is extracting financial covenants from your document
              </p>
              <div className="w-full max-w-md">
                <Progress value={progress} className="mb-2" />
                <p className="text-xs text-center text-muted-foreground">{progress}% complete</p>
              </div>
            </>
          ) : uploadedFile ? (
            <>
              <CheckCircle2 className="w-12 h-12 text-success mb-4" />
              <p className="text-lg font-semibold mb-2">Upload Complete!</p>
              <p className="text-sm text-muted-foreground">{uploadedFile.name}</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">
                {isDragActive ? 'Drop your LMA document here' : 'Upload LMA Document'}
              </p>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Drag and drop a PDF file, or click to browse
              </p>
                  <Button type="button" className="btn-gradient gap-2" onClick={() => fileInputRef.current?.click()}>
                    <FileText className="w-4 h-4" />
                    Select PDF File
                  </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;

