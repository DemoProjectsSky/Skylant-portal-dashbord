import type { Lead, SalesExecutive } from "../types";

export const leads: Lead[] = [
  { id: "LD-1024", name: "Rahul Sharma", mobile: "+91 98765 43210", email: "rahul.sharma@email.com", college: "Jhulelal Institute of Technology", program: "Full Stack Development", source: "College Visit", assignedTo: "Amit", status: "INTERESTED", nextFollowUp: "Today, 11:30 AM", lastContact: "Yesterday" },
  { id: "LD-1023", name: "Priya Patil", mobile: "+91 97654 32109", email: "priya.patil@email.com", college: "YCCE", program: "Data Science", source: "Instagram", assignedTo: "Priya", status: "FOLLOW-UP", nextFollowUp: "Today, 02:00 PM", lastContact: "2 days ago" },
  { id: "LD-1022", name: "Aman Verma", mobile: "+91 99887 66554", email: "aman.verma@email.com", college: "Raisoni College", program: "AI & Machine Learning", source: "Website", assignedTo: "Rahul", status: "NEW", nextFollowUp: "Tomorrow, 10:00 AM", lastContact: "Not contacted" },
  { id: "LD-1021", name: "Sneha Joshi", mobile: "+91 98989 11223", email: "sneha.joshi@email.com", college: "Priyadarshini College", program: "Digital Marketing", source: "Student Referral", assignedTo: "Sneha", status: "CONVERTED", nextFollowUp: "-", lastContact: "Mar 18, 2026" },
  { id: "LD-1020", name: "Aditya Gupta", mobile: "+91 91234 56789", email: "aditya.gupta@email.com", college: "G.H. Raisoni University", program: "Python Development", source: "College Seminar", assignedTo: "Amit", status: "COUNSELLING", nextFollowUp: "Mar 22, 04:30 PM", lastContact: "Mar 20, 2026" },
  { id: "LD-1019", name: "Neha Thakur", mobile: "+91 90123 45678", email: "neha.thakur@email.com", college: "YCCE", program: "Cloud Computing", source: "Google Form", assignedTo: "Priya", status: "NOT INTERESTED", nextFollowUp: "-", lastContact: "Mar 19, 2026" },
  { id: "LD-1018", name: "Vikram Singh", mobile: "+91 93456 78901", email: "vikram.singh@email.com", college: "Jhulelal Institute of Technology", program: "Cyber Security", source: "WhatsApp", assignedTo: "Rahul", status: "PAYMENT PENDING", nextFollowUp: "Mar 23, 11:00 AM", lastContact: "Mar 21, 2026" },
  { id: "LD-1017", name: "Meera Kulkarni", mobile: "+91 94567 89012", email: "meera.k@email.com", college: "Raisoni College", program: "Web Development", source: "LinkedIn", assignedTo: "Sneha", status: "NO RESPONSE", nextFollowUp: "Mar 24, 01:00 PM", lastContact: "Mar 17, 2026" },
];

export const salesExecutives: SalesExecutive[] = [
  { id: "SE-01", name: "Amit Sharma", email: "amit@skylant.com", phone: "+91 98765 10001", assignedLeads: 86, callsToday: 32, interested: 24, followUps: 18, converted: 12, reportStatus: "Submitted", currentStatus: "Active" },
  { id: "SE-02", name: "Priya Nair", email: "priya@skylant.com", phone: "+91 98765 10002", assignedLeads: 74, callsToday: 28, interested: 19, followUps: 22, converted: 9, reportStatus: "Submitted", currentStatus: "Active" },
  { id: "SE-03", name: "Rahul Mehta", email: "rahul@skylant.com", phone: "+91 98765 10003", assignedLeads: 68, callsToday: 17, interested: 16, followUps: 14, converted: 7, reportStatus: "Pending", currentStatus: "Away" },
  { id: "SE-04", name: "Sneha Joshi", email: "sneha@skylant.com", phone: "+91 98765 10004", assignedLeads: 59, callsToday: 25, interested: 21, followUps: 11, converted: 8, reportStatus: "Submitted", currentStatus: "Active" },
];

export const colleges = [
  { name: "Jhulelal Institute of Technology", city: "Nagpur", type: "Engineering", leads: 182, campaigns: 3, status: "Active" },
  { name: "Raisoni College", city: "Nagpur", type: "Engineering", leads: 146, campaigns: 2, status: "Active" },
  { name: "YCCE", city: "Nagpur", type: "Engineering", leads: 128, campaigns: 2, status: "Active" },
  { name: "G.H. Raisoni University", city: "Amravati", type: "University", leads: 96, campaigns: 1, status: "Active" },
  { name: "Priyadarshini College", city: "Nagpur", type: "Engineering", leads: 88, campaigns: 1, status: "Paused" },
];

export const programs = [
  { name: "Full Stack Development", duration: "6 months", mode: "Hybrid", fees: "₹45,000", leads: 248, converted: 28, status: "Active" },
  { name: "Data Science", duration: "8 months", mode: "Online", fees: "₹65,000", leads: 186, converted: 21, status: "Active" },
  { name: "AI & Machine Learning", duration: "9 months", mode: "Hybrid", fees: "₹75,000", leads: 142, converted: 16, status: "Active" },
  { name: "Python Development", duration: "4 months", mode: "Offline", fees: "₹32,000", leads: 118, converted: 14, status: "Active" },
  { name: "Digital Marketing", duration: "3 months", mode: "Online", fees: "₹24,000", leads: 96, converted: 9, status: "Draft" },
];

export const activity = [
  ["New lead added", "Rahul Sharma was added from College Visit", "8 min ago", "user-plus"],
  ["Lead assigned", "Priya Patil assigned to Priya Nair", "32 min ago", "user-check"],
  ["Follow-up completed", "Amit Sharma completed a follow-up", "1 hour ago", "phone-call"],
  ["Lead converted", "Sneha Joshi converted to Full Stack", "2 hours ago", "badge-check"],
  ["Daily report submitted", "Amit Sharma submitted today’s report", "3 hours ago", "file-check"],
];

export const leadTrend = [42, 58, 51, 72, 64, 88, 76, 93, 80, 104, 98, 116];
