import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Save,
  X,
  Car,
  MapPin,
  Calendar,
  DollarSign,
  Hash,
  Building,
  Eye,
  User,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { PDFViewer } from './PDFViewer';
import { TrafficViolationStats } from './TrafficViolationStats';
import { ViolationImportReport } from './ViolationImportReport';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ExtractedViolation,
  MatchedViolation,
  ImportProcessingResult,
  PDFHeaderData,
  MATCH_CONFIDENCE_LABELS,
  MATCH_CONFIDENCE_COLORS
} from '@/types/violations';
import { useViolationMatching, useViolationSave } from '@/hooks/useViolationMatching';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const TrafficViolationPDFImport: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ImportProcessingResult | null>(null);
  const [selectedViolations, setSelectedViolations] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const { processViolations, isProcessing: isMatching } = useViolationMatching({
    companyId,
    autoLink: true,
    checkDuplicates: true
  });
  const { saveViolations, isSaving } = useViolationSave();

  // Extract text from PDF using pdf.js
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    console.log(`📄 Extracting text from PDF: ${pdf.numPages} pages`);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  };

  // Convert PDF to images (fallback if text extraction fails)
  const convertPDFToImages = async (file: File): Promise<File[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: File[] = [];

    console.log(`📄 Converting PDF to images: ${pdf.numPages} pages`);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const scale = 2;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 0.95);
      });

      const imageFile = new File(
        [blob],
        `${file.name.replace('.pdf', '')}_page_${pageNum}.png`,
        { type: 'image/png' }
      );
      images.push(imageFile);
    }

    return images;
  };

  // Extract data from PDF file
  const extractDataFromPDF = async (file: File): Promise<{
    header?: PDFHeaderData;
    violations: ExtractedViolation[];
  }> => {
    try {
      // If PDF file
      if (file.type === 'application/pdf') {
        toast({
          title: '📄 Reading PDF file...',
          description: 'Extracting text from file',
        });

        // Try to extract text first (faster and cheaper)
        let pdfText = '';
        try {
          pdfText = await extractTextFromPDF(file);
          console.log(`📝 Extracted ${pdfText.length} characters from PDF`);
        } catch (textError) {
          console.error('Error extracting text from PDF:', textError);
        }

        // If we have enough text, send for analysis
        if (pdfText.length > 50) {
          toast({
            title: '✅ Text extracted',
            description: `Extracted ${pdfText.length} characters - Analyzing...`,
          });

          console.log('📤 Sending text for analysis...');
          const { data, error } = await supabase.functions.invoke('extract-traffic-violations', {
            body: {
              text: pdfText,
              source: file.name
            }
          });

          if (error) {
            console.error('Error from text analysis:', error);
            throw new Error('FALLBACK_TO_IMAGES');
          }

          if (!data?.success) {
            if (data?.error === 'PDF_NO_TEXT') {
              throw new Error('FALLBACK_TO_IMAGES');
            }
            throw new Error(data?.details || 'Failed to analyze text');
          }

          return {
            header: data.header,
            violations: data.violations
          };

        } else {
          // Not enough text, use images
          console.log('⚠️ Not enough text, converting to images...');
          throw new Error('FALLBACK_TO_IMAGES');
        }

      } else {
        // Image file - send directly
        const formData = new FormData();
        formData.append('file', file);

        const { data, error } = await supabase.functions.invoke('extract-traffic-violations', {
          body: formData
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.details || 'Failed to extract data');

        return {
          header: data.header,
          violations: data.violations
        };
      }

    } catch (err: any) {
      // Fallback: convert PDF to images if text extraction failed
      if (err.message === 'FALLBACK_TO_IMAGES' && file.type === 'application/pdf') {
        toast({
          title: '📸 Converting PDF to images...',
          description: 'Converting file to images for visual analysis',
        });

        const images = await convertPDFToImages(file);
        toast({
          title: '✅ Conversion complete',
          description: `Converted ${images.length} pages`,
        });

        let allViolations: ExtractedViolation[] = [];
        let header: PDFHeaderData | undefined;

        for (const imageFile of images) {
          const formData = new FormData();
          formData.append('file', imageFile);

          const { data, error } = await supabase.functions.invoke('extract-traffic-violations', {
            body: formData
          });

          if (error || !data?.success) {
            console.warn('Error processing image:', error || data?.details);
            continue;
          }

          // Merge violations from all pages
          if (!header && data.header) {
            header = data.header;
          }
          allViolations = [...allViolations, ...data.violations];
        }

        return { header, violations: allViolations };
      }

      throw err;
    }
  };

  // Process uploaded files
  const processFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please upload a file (image or PDF) first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      let allViolations: ExtractedViolation[] = [];
      let header: PDFHeaderData | undefined;

      // Extract data from all files
      for (const file of uploadedFiles) {
        try {
          const extracted = await extractDataFromPDF(file);
          if (extracted.header) {
            header = extracted.header;
          }
          allViolations = [...allViolations, ...extracted.violations];
        } catch (error: unknown) {
          console.error(`Failed to process file ${file.name}:`, error);
          toast({
            title: "Warning",
            description: `Failed to process file ${file.name}: ${error.message}`,
            variant: "destructive"
          });
        }
      }

      if (allViolations.length === 0) {
        throw new Error('No violations found in the uploaded files');
      }

      // Process violations: match and check duplicates
      const result = await processViolations(allViolations);

      // Add header data to result
      result.header = header;

      setProcessingResult(result);
      setSelectedViolations(new Set(
        result.violations
          .filter(v => v.status === 'matched' && !v.is_duplicate)
          .map(v => v.id)
      ));

      toast({
        title: "Data extracted successfully",
        description: `Extracted ${result.total_extracted} violations, ${result.successful_matches} matched to vehicles`,
      });

    } catch (error: unknown) {
      toast({
        title: "Processing error",
        description: `Failed to process files: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save selected violations
  const saveSelectedViolations = async () => {
    if (!processingResult || selectedViolations.size === 0) {
      toast({
        title: "Error",
        description: "Please select violations to save",
        variant: "destructive"
      });
      return;
    }

    const violationsToSave = processingResult.violations.filter(v =>
      selectedViolations.has(v.id) && v.status === 'matched' && !v.is_duplicate
    );

    const result = await saveViolations(
      violationsToSave,
      companyId,
      'moi_pdf',
      processingResult.header?.file_number
    );

    toast({
      title: "Saved successfully",
      description: `Saved ${result.success} violations to the system${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
    });

    if (result.success > 0) {
      // Reset data
      setProcessingResult(null);
      setUploadedFiles([]);
      setSelectedViolations(new Set());
    }
  };

  // Setup drag and drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const supportedFiles = acceptedFiles.filter(file =>
      file.type === 'application/pdf' ||
      file.type.startsWith('image/')
    );

    if (supportedFiles.length !== acceptedFiles.length) {
      toast({
        title: "Warning",
        description: "Only PDF and image files accepted (JPG, PNG, GIF, WEBP)",
        variant: "destructive"
      });
    }

    setUploadedFiles(prev => [...prev, ...supportedFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    multiple: true
  });

  // Remove file
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle violation selection
  const toggleViolationSelection = (violationId: string) => {
    setSelectedViolations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(violationId)) {
        newSet.delete(violationId);
      } else {
        newSet.add(violationId);
      }
      return newSet;
    });
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (!processingResult) return;

    const matchableViolations = processingResult.violations.filter(
      v => v.status === 'matched' && !v.is_duplicate
    );
    if (selectedViolations.size === matchableViolations.length) {
      setSelectedViolations(new Set());
    } else {
      setSelectedViolations(new Set(matchableViolations.map(v => v.id)));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6" />
            استيراد المخالفات المرورية
          </CardTitle>
          <CardDescription>
            Upload and process PDF or image files for traffic violations and automatically extract data
            <br />
            <span className="text-green-600 text-sm font-medium">
              ✅ Images (JPG, PNG) preferred for best results
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload">Upload Files</TabsTrigger>
              <TabsTrigger value="process" disabled={uploadedFiles.length === 0}>
                Process Data
              </TabsTrigger>
              <TabsTrigger value="review" disabled={!processingResult}>
                Review & Save
              </TabsTrigger>
              <TabsTrigger value="stats" disabled={!processingResult}>
                Statistics
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input {...getInputProps()} />
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                {isDragActive ? (
                  <p className="text-blue-600">Drag files here...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">Drag files here or click to select</p>
                    <p className="text-sm text-slate-500">Supports PDF and images (JPG, PNG, GIF, WEBP)</p>
                  </div>
                )}
              </div>

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Uploaded Files ({uploadedFiles.length})</h4>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPreviewFile(file);
                            setIsPreviewOpen(true);
                          }}
                          className="h-6 w-6 p-0"
                          title="Preview file"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                          title="Delete file"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Process Tab */}
            <TabsContent value="process" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Will extract data from files and automatically link to vehicles and contracts in the system.
                  Images (JPG, PNG) work best. PDF files may not work correctly.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  onClick={processFiles}
                  disabled={isProcessing || isMatching || uploadedFiles.length === 0}
                  className="flex items-center gap-2"
                >
                  {(isProcessing || isMatching) ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {(isProcessing || isMatching) ? 'Processing...' : 'Start Processing'}
                </Button>
              </div>

              {(isProcessing || isMatching) && (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-lg font-medium">Extracting data from files...</p>
                  <p className="text-sm text-slate-500 mt-2">Please wait, this may take a few minutes</p>
                </div>
              )}
            </TabsContent>

            {/* Review & Save Tab */}
            <TabsContent value="review" className="space-y-4">
              {processingResult && (
                <>
                  {/* Header info */}
                  {processingResult.header && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Document Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">File Number:</span>
                            <p className="font-medium">{processingResult.header.file_number || '-'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Vehicle Plate:</span>
                            <p className="font-medium">{processingResult.header.vehicle_plate || '-'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Owner:</span>
                            <p className="font-medium">{processingResult.header.owner_name || '-'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Total Violations:</span>
                            <p className="font-medium">{processingResult.header.total_violations || '-'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.total_extracted}</p>
                            <p className="text-sm text-slate-600">Total</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.successful_matches}</p>
                            <p className="text-sm text-slate-600">Matched</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Copy className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.duplicates_found}</p>
                            <p className="text-sm text-slate-600">Duplicates</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.errors}</p>
                            <p className="text-sm text-slate-600">Errors</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.total_amount.toFixed(2)}</p>
                            <p className="text-sm text-slate-600">Total (QR)</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                      >
                        {selectedViolations.size === processingResult.violations.filter(v => v.status === 'matched' && !v.is_duplicate).length
                          ? 'Deselect All'
                          : 'Select All'
                        }
                      </Button>
                      <span className="text-sm text-slate-600">
                        Selected: {selectedViolations.size} of {processingResult.successful_matches}
                      </span>
                    </div>

                    <Button
                      onClick={saveSelectedViolations}
                      disabled={isSaving || selectedViolations.size === 0}
                      className="flex items-center gap-2"
                    >
                      {isSaving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Selected ({selectedViolations.size})
                    </Button>
                  </div>

                  {/* Violations table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Extracted Violations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Select</TableHead>
                              <TableHead>Ref#</TableHead>
                              <TableHead>Date & Time</TableHead>
                              <TableHead>Plate</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Contract</TableHead>
                              <TableHead>Confidence</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {processingResult.violations.map((violation) => (
                              <TableRow key={violation.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedViolations.has(violation.id)}
                                    onChange={() => toggleViolationSelection(violation.id)}
                                    disabled={violation.status === 'error' || violation.is_duplicate}
                                    className="rounded"
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  <div className="flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {violation.reference_number || violation.violation_number}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(violation.date), 'dd/MM/yyyy', { locale: ar })}
                                    </div>
                                    {violation.time && (
                                      <span className="text-xs text-slate-500">{violation.time}</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Car className="h-3 w-3" />
                                    <span className="font-mono text-sm">{violation.plate_number}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="text-sm">{violation.location}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {violation.violation_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {violation.customer_name ? (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span className="text-sm">{violation.customer_name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {violation.contract_number ? (
                                    <span className="text-sm font-mono">{violation.contract_number}</span>
                                  ) : (
                                    <span className="text-slate-400 text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className={`text-xs font-medium ${MATCH_CONFIDENCE_COLORS[violation.match_confidence]}`}>
                                    {MATCH_CONFIDENCE_LABELS[violation.match_confidence]}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span className="font-medium">{violation.fine_amount.toFixed(2)} QR</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <Badge
                                      variant={
                                        violation.status === 'matched' ? 'default' :
                                          violation.status === 'error' ? 'destructive' : 'secondary'
                                      }
                                    >
                                      {violation.status === 'matched' ? 'Matched' :
                                        violation.status === 'error' ? 'Error' : 'Extracted'}
                                    </Badge>
                                    {violation.is_duplicate && (
                                      <Badge variant="outline" className="text-xs">
                                        Duplicate
                                      </Badge>
                                    )}
                                    {violation.errors.length > 0 && (
                                      <div className="text-xs text-red-600">
                                        {violation.errors.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="stats" className="space-y-6">
              {processingResult && (
                <>
                  <TrafficViolationStats violations={processingResult.violations} />
                  <ViolationImportReport
                    violations={processingResult.violations}
                    onExport={(format) => {
                      toast({
                        title: "Export Report",
                        description: `Report will be exported in ${format} format soon`,
                      });
                    }}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* PDF Viewer Component */}
      {previewFile && (
        <PDFViewer
          file={previewFile}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewFile(null);
          }}
        />
      )}
    </div>
  );
};
