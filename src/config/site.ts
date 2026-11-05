export const SITE = {
  name: 'PdfConvert',
  tagline: 'Free file tools that run 100% in your browser — nothing is ever uploaded',
  // Working brand for the demo (repo: pdftconvert). Rename here when the real
  // brand/domain is decided — every page reads from this file.
};

export type Tool = {
  slug: string;
  name: string;
  category: 'PDF' | 'Image';
  blurb: string;
};

export const TOOLS: Tool[] = [
  { slug: 'merge-pdf', name: 'Merge PDF', category: 'PDF', blurb: 'Combine several PDFs into one file, in exactly the order you choose.' },
  { slug: 'image-to-pdf', name: 'Image to PDF', category: 'PDF', blurb: 'Turn JPG and PNG images into a single tidy PDF document.' },
  { slug: 'compress-image', name: 'Compress Image', category: 'Image', blurb: 'Shrink PNG, JPG and WebP images with the quality under your control.' },
];

export const PLANNED: { name: string; category: string }[] = [
  { name: 'Split PDF', category: 'PDF' },
  { name: 'PDF to JPG', category: 'PDF' },
  { name: 'Protect PDF', category: 'PDF' },
  { name: 'Sign PDF', category: 'PDF' },
  { name: 'Convert Image', category: 'Image' },
  { name: 'Resize Image', category: 'Image' },
];
