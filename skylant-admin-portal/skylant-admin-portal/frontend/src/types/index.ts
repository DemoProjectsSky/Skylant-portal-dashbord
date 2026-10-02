export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "FOLLOW-UP"
  | "COUNSELLING"
  | "PAYMENT PENDING"
  | "CONVERTED"
  | "NOT INTERESTED"
  | "NO RESPONSE";

export interface Lead {
  id: string;
  name: string;
  mobile: string;
  email: string;
  college: string;
  program: string;
  source: string;
  assignedTo: string;
  status: LeadStatus;
  nextFollowUp: string;
  lastContact: string;
}

export interface SalesExecutive {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedLeads: number;
  callsToday: number;
  interested: number;
  followUps: number;
  converted: number;
  reportStatus: "Submitted" | "Pending";
  currentStatus: "Active" | "Away";
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}
