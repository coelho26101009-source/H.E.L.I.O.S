export interface LogMessage {
  id: string;
  source: 'USER' | 'JARVIS' | 'SYSTEM' | 'ERROR';
  text: string;
  timestamp: string;
}