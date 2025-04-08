export interface MessageContent {
  content: {
    type: 'text' | 'image' | 'file';
    text?: string;
    url?: string;
    metadata?: {
      [key: string]: any;
    };
  };
}
