export type UserRole = 'member' | 'presbytery' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  picUrl?: string;
  color?: string;
  joinedDate: string;
  online: boolean;
  teams?: Record<string, 'member' | 'mentor'>;
  
  // Mandatory fields for mobile app
  userId?: string; // Church Member ID
  occupation?: string;
  dateOfBirth?: string;
  isProfileComplete?: boolean;
  chatBg?: string; // Custom chat background URL or color
}

export interface Notice {
  id: string;
  title: string;
  type: 'gen' | 'urg' | 'pin';
  body: string;
  author: string;
  date: string;
  eventDate?: string; // Optional field for calendar integration
  createdAt: string;
}

export interface HomeConfig {
  id: string;
  theme: string;
  motto: string;
  logoUrl?: string;
  services: Array<{ label: string; time: string; id: string }>;
  announcement?: string;
  heroUrl?: string;
  heroSlides?: string[];
  
  // Church Information (Admin Updated)
  churchInfo?: {
    location?: string;
    bankDetails?: Array<{ bankName: string; accountName: string; accountNumber: string }>;
    transferAccounts?: Array<{ provider: string; details: string }>;
    contactEmail?: string;
    contactPhone?: string;
  };
}

export interface ChurchConduct {
  id: string;
  title: string;
  points: string[];
  category: 'general' | 'marriage' | 'youth' | 'protocol';
  lastUpdated?: any;
}

export interface Hymn {
  id: string;
  number: number;
  title: string;
  lyrics: string[];
  chorus?: string;
  category: string;
}

export interface Sermon {
  id: string;
  title: string;
  speaker: string;
  date: string;
  type: string;
  videoUrl?: string;
  audioUrl?: string;
  summary?: string;
  color?: string;
}

export interface EventItem {
  id: string;
  title: string;
  startDate: string; // ISO string
  endDate?: string;
  type: 'service' | 'conference' | 'meeting' | 'other';
  summary: string;
  location?: string;
  posterUrl?: string;
  createdAt: any;
}

export interface GalleryItem {
  id: string;
  src: string;
  type: 'img' | 'vid';
  uploadedBy?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  members: number; // For summary display
  memberIds?: string[]; // Actual UIDs
}

export interface TeamTask {
  id: string;
  title: string;
  desc: string;
  status: 'pending' | 'completed';
  assignedTo?: string[];
  dueDate?: string;
  createdAt: any;
}

export interface TeamNotice {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  img?: string;
  vid?: string;
  time: string;
  createdAt: any; // Timestamp
  replyTo?: {
    sender: string;
    text?: string;
    img?: string;
    vid?: string;
  };
}

export interface Donation {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'offering' | 'tithe' | 'welfare' | 'other';
  date: string;
  createdAt: any;
}

export interface UpdateRequest {
  id: string;
  title: string;
  body: string;
  type: 'gen' | 'urg' | 'pin';
  imgUrl?: string;
  fileUrl?: string;
  authorId: string;
  authorName: string;
  status: 'pending' | 'exported' | 'rejected';
  createdAt: any;
}

export interface EmergencyMessage {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  status: 'unread' | 'read' | 'resolved';
  createdAt: any;
}
