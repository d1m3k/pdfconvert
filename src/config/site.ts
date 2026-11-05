export const SITE = {
  name: 'PdfConvert',
  tagline: 'Free file tools that run 100% in your browser — nothing is ever uploaded',
  // Working brand for the demo (repo: pdfconvert). Rename here when the real
  // brand/domain is decided — every page reads from this file.
};

export type Tool = {
  slug: string;
  name: string;
  category: 'PDF' | 'Image';
  blurb: string;
};

export const TOOLS: Tool[] = [
  // PDF — organize
  { slug: 'merge-pdf', name: 'Merge PDF', category: 'PDF', blurb: 'Combine several PDFs into one file, in exactly the order you choose.' },
  { slug: 'split-pdf', name: 'Split PDF', category: 'PDF', blurb: 'Split a PDF by page ranges, or extract every page as its own file.' },
  { slug: 'organize-pdf', name: 'Organize PDF', category: 'PDF', blurb: 'See every page as a thumbnail — reorder, rotate and delete pages visually.' },
  { slug: 'rotate-pdf', name: 'Rotate PDF', category: 'PDF', blurb: 'Rotate all pages, or only the sideways ones, in any PDF.' },
  { slug: 'delete-pdf-pages', name: 'Delete PDF Pages', category: 'PDF', blurb: 'Remove the pages you do not need and save a cleaner document.' },
  // PDF — convert
  { slug: 'image-to-pdf', name: 'Image to PDF', category: 'PDF', blurb: 'Turn JPG and PNG images into a single tidy PDF document.' },
  { slug: 'pdf-to-jpg', name: 'PDF to JPG', category: 'PDF', blurb: 'Turn each PDF page into a crisp JPG image, ready to share or embed.' },
  { slug: 'pdf-to-png', name: 'PDF to PNG', category: 'PDF', blurb: 'Export PDF pages as sharp PNG images with transparent-ready quality.' },
  // PDF — edit & security
  { slug: 'compress-pdf', name: 'Compress PDF', category: 'PDF', blurb: 'Shrink a PDF for upload forms and email, with the size/quality trade in your hands.' },
  { slug: 'protect-pdf', name: 'Protect PDF', category: 'PDF', blurb: 'Encrypt a PDF with a password using strong AES-256 encryption.' },
  { slug: 'unlock-pdf', name: 'Unlock PDF', category: 'PDF', blurb: 'Remove the password from your own PDF when you know it, or clear owner restrictions.' },
  { slug: 'sign-pdf', name: 'Sign PDF', category: 'PDF', blurb: 'Draw your signature and place it on any page of your document.' },
  { slug: 'add-watermark', name: 'Add Watermark', category: 'PDF', blurb: 'Stamp text such as CONFIDENTIAL or DRAFT across every page.' },
  { slug: 'add-page-numbers', name: 'Add Page Numbers', category: 'PDF', blurb: 'Number every page of a document, in the position and format you pick.' },
  // Image
  { slug: 'compress-image', name: 'Compress Image', category: 'Image', blurb: 'Shrink PNG, JPG and WebP images with the quality under your control.' },
  { slug: 'convert-image', name: 'Convert Image', category: 'Image', blurb: 'Convert between PNG, JPG and WebP in batches, keeping names tidy.' },
  { slug: 'resize-image', name: 'Resize Image', category: 'Image', blurb: 'Change image dimensions by pixels or percentage, with the ratio locked.' },
  { slug: 'crop-image', name: 'Crop Image', category: 'Image', blurb: 'Crop a photo or screenshot with free or fixed-ratio guides.' },
  { slug: 'rotate-image', name: 'Rotate & Flip Image', category: 'Image', blurb: 'Rotate a photo upright or mirror it, without any quality loss games.' },
];

export const PHASE2: { name: string; category: string }[] = [
  { name: 'OCR PDF', category: 'PDF' },
  { name: 'Edit PDF', category: 'PDF' },
  { name: 'PDF to Text', category: 'PDF' },
  { name: 'Markdown to PDF', category: 'PDF' },
  { name: 'Favicon Generator', category: 'Image' },
];
