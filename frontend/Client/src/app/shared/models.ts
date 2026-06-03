// ---- Auth ----
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'receptionist' | 'housekeeping' | 'guest';
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

export interface AuthResponse {
  status: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; role?: string; }

// ---- Room ----
export type RoomType = 'single' | 'double' | 'twin' | 'suite' | 'deluxe' | 'presidential';
export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'cleaning' | 'out_of_order';

export interface Room {
  _id: string;
  roomNumber: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  pricePerNight: number;
  capacity: { adults: number; children: number };
  size?: number;
  bedType?: string;
  amenities: { name: string; icon?: string }[];
  images: string[];
  description?: string;
  isSmokingAllowed: boolean;
  isPetFriendly: boolean;
  hasBalcony: boolean;
  rating: { average: number; count: number };
  isAvailable: boolean;
  lastCleaned?: Date;
  createdAt: Date;
}

// ---- Guest ----
export type VipStatus = 'none' | 'silver' | 'gold' | 'platinum';

export interface Guest {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: Date;
  nationality?: string;
  idType?: string;
  address?: { street?: string; city?: string; state?: string; country?: string; postalCode?: string };
  vipStatus: VipStatus;
  preferences?: {
    floorPreference?: string;
    bedPreference?: string;
    smokingRoom?: boolean;
    dietaryRestrictions?: string[];
    specialRequests?: string;
  };
  totalStays: number;
  totalSpent: number;
  isBlacklisted: boolean;
  createdAt: Date;
}

// ---- Booking ----
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';

export interface Booking {
  _id: string;
  bookingReference: string;
  guest: Guest | string;
  room: Room | string;
  checkIn: Date;
  checkOut: Date;
  actualCheckIn?: Date;
  actualCheckOut?: Date;
  adults: number;
  children: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  pricing: {
    pricePerNight: number;
    nights: number;
    subtotal: number;
    taxes: number;
    discount: number;
    extraCharges: number;
    totalAmount: number;
  };
  payments: { amount: number; method: string; transactionId?: string; paidAt: Date }[];
  source?: string;
  specialRequests?: string;
  amountPaid: number;
  amountDue: number;
  createdAt: Date;
  createdBy?: User | string;
}

// ---- API ----
export interface ApiResponse<T> {
  status: 'success' | 'fail' | 'error';
  data: T;
  results?: number;
  pagination?: { page: number; limit: number; total: number; pages: number };
  message?: string;
}

export interface ApiError {
  status: string;
  message: string;
  errors?: { field: string; message: string }[];
}

// ---- Dashboard Stats ----
export interface BookingStats {
  statusSummary: { _id: BookingStatus; count: number }[];
  totalRevenue: number;
  todayArrivals: number;
  todayDepartures: number;
}

export interface RoomStats {
  byType: { _id: string; count: number; avgPrice: number; available: number; occupied: number }[];
  byStatus: { _id: string; count: number }[];
}