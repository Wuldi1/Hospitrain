// TypeScript declaration file for shared interfaces and types

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  phone?: string;
  prefs?: {
    locale: string;
  };
}

export interface Hospital {
  id: string;
  name: string;
  code: string;
  contact: {
    phone: string;
    email: string;
  };
  region: string;
  meta?: Record<string, any>;
}

export interface Drill {
  id: string;
  hospitalId: string;
  title: string;
  templates: string[];
  schedule: Array<{ time: string; text: string }>;
  status: string;
  createdBy: string;
  participants: string[];
  createdAt: string;
}