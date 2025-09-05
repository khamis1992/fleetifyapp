import React from 'react';

interface FormattedResponseProps {
  content: string;
  className?: string;
}

export const FormattedResponse: React.FC<FormattedResponseProps> = ({ content, className = '' }) => {
  // معالجة النص لتحويل Markdown إلى JSX
  const formatContent = (text: string) => {
    // تقسيم النص إلى أسطر
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    
    lines.forEach((line, index) => {
      // معالجة العناوين (####, ###, ##, #)
      if (line.trim().startsWith('####')) {
        const headerText = line.replace(/^#+\s*/, '');
        elements.push(
          <h4 key={index} className="text-lg font-bold text-primary mt-4 mb-2 border-r-4 border-primary pr-3">
            {formatInlineText(headerText)}
          </h4>
        );
      } else if (line.trim().startsWith('###')) {
        const headerText = line.replace(/^#+\s*/, '');
        elements.push(
          <h3 key={index} className="text-xl font-bold text-primary mt-6 mb-3 border-r-4 border-primary pr-3">
            {formatInlineText(headerText)}
          </h3>
        );
      } else if (line.trim().startsWith('##')) {
        const headerText = line.replace(/^#+\s*/, '');
        elements.push(
          <h2 key={index} className="text-2xl font-bold text-primary mt-6 mb-4 border-r-4 border-primary pr-3">
            {formatInlineText(headerText)}
          </h2>
        );
      } else if (line.trim().startsWith('#')) {
        const headerText = line.replace(/^#+\s*/, '');
        elements.push(
          <h1 key={index} className="text-3xl font-bold text-primary mt-8 mb-4 border-r-4 border-primary pr-3">
            {formatInlineText(headerText)}
          </h1>
        );
      }
      // معالجة القوائم المرقمة
      else if (line.trim().match(/^\d+\.\s/)) {
        const listText = line.replace(/^\d+\.\s*/, '');
        elements.push(
          <div key={index} className="flex items-start gap-2 my-2">
            <span className="font-bold text-primary min-w-[1.5rem]">
              {line.match(/^\d+/)?.[0]}.
            </span>
            <span className="flex-1">{formatInlineText(listText)}</span>
          </div>
        );
      }
      // معالجة القوائم النقطية
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listText = line.replace(/^[-*]\s*/, '');
        elements.push(
          <div key={index} className="flex items-start gap-2 my-1 mr-4">
            <span className="text-primary font-bold min-w-[1rem]">•</span>
            <span className="flex-1">{formatInlineText(listText)}</span>
          </div>
        );
      }
      // معالجة الفقرات العادية
      else if (line.trim() !== '') {
        elements.push(
          <p key={index} className="my-2 leading-relaxed">
            {formatInlineText(line)}
          </p>
        );
      }
      // إضافة مسافة فارغة
      else {
        elements.push(<div key={index} className="h-2" />);
      }
    });
    
    return elements;
  };

  // معالجة النص المضمن (النص العريض، المائل، إلخ)
  const formatInlineText = (text: string) => {
    // معالجة النص العريض **text**
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = text.split(boldRegex);
    
    return parts.map((part, index) => {
      // إذا كان الفهرس فردي، فهذا نص عريض
      if (index % 2 === 1) {
        return (
          <strong key={index} className="font-bold text-gray-900 dark:text-gray-100">
            {part}
          </strong>
        );
      }
      // معالجة النص المائل *text*
      else {
        const italicRegex = /\*(.*?)\*/g;
        const italicParts = part.split(italicRegex);
        
        return italicParts.map((italicPart, italicIndex) => {
          if (italicIndex % 2 === 1) {
            return (
              <em key={`${index}-${italicIndex}`} className="italic text-gray-700 dark:text-gray-300">
                {italicPart}
              </em>
            );
          }
          return italicPart;
        });
      }
    });
  };

  return (
    <div className={`prose prose-sm max-w-none text-right ${className}`} dir="rtl">
      <div className="space-y-1">
        {formatContent(content)}
      </div>
    </div>
  );
};