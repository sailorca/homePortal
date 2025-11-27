'use client';

// Button with copy-to-clipboard functionality
import React, { useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export default function CopyButton({ text, label = 'Copy', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
        copied
          ? 'bg-green-600 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      } ${className}`}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
