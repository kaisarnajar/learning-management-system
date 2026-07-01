export interface AcademyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
}

export interface StudentInfo {
  name: string;
  address: string;
  phone: string;
}

export interface PaymentInfo {
  receiptId: string;
  date: string;
  method: string;
  courseName: string;
  academicTerm?: string;
  amount: number;
  baseAmount?: number;
  gstAmount?: number;
  shippingAmount?: number;
  currency?: string;
  typeLabel?: string;
}

export interface AuthorityInfo {
  name: string;
  designation: string;
  signatureUrl: string;
  stampUrl?: string; // Optional
}

export interface ReceiptData {
  academy: AcademyInfo;
  student: StudentInfo;
  payment: PaymentInfo;
  authority: AuthorityInfo;
  termsAndConditions: string[];
}
