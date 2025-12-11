import { RequestCategory, RequestStatus } from "@prisma/client";

export type SystemTemplate = {
  category: RequestCategory;
  status: RequestStatus;
  title: string;
  body: string;
  missingFields?: string[];
};

// System-provided templates that ship out of the box for every HOA.
// Neutral, no timelines, and focused on asking for required details.
const MATRIX: SystemTemplate[] = [
  {
    category: RequestCategory.GENERAL,
    status: RequestStatus.NEEDS_INFO,
    title: "General · Needs info · Default",
    body: "Hi {{resident_name}},\n\nThanks for reaching out to {{hoa_name}}. To move this forward, please share {{missing_info}}. Once we have it, we can continue the review.\n\nThanks,\n{{manager_name}}",
    missingFields: ["unit_number"],
  },
  {
    category: RequestCategory.GENERAL,
    status: RequestStatus.OPEN,
    title: "General · Open · Default",
    body: "Hi {{resident_name}},\n\nThanks for your message. We are reviewing it now and will follow up once we have what we need.\n\nThanks,\n{{manager_name}}",
  },
  {
    category: RequestCategory.GENERAL,
    status: RequestStatus.IN_PROGRESS,
    title: "General · In progress · Default",
    body: "Hi {{resident_name}},\n\nWe are working on your request and will reply once the review is complete.\n\nThanks,\n{{manager_name}}",
  },
  {
    category: RequestCategory.MAINTENANCE,
    status: RequestStatus.NEEDS_INFO,
    title: "Maintenance · Needs info · Default",
    body: "Hi {{resident_name}},\n\nWe received your maintenance request. To proceed, please provide {{missing_info}} so we can dispatch the right help.\n\nOnce we have it, we will continue.\n\nThanks,\n{{manager_name}}",
    missingFields: ["unit_number", "photos"],
  },
  {
    category: RequestCategory.MAINTENANCE,
    status: RequestStatus.OPEN,
    title: "Maintenance · Open · Default",
    body: "Hi {{resident_name}},\n\nWe received your maintenance request and are reviewing the details. We will update you after the review.\n\nThanks,\n{{manager_name}}",
  },
  {
    category: RequestCategory.MAINTENANCE,
    status: RequestStatus.IN_PROGRESS,
    title: "Maintenance · In progress · Default",
    body: "Hi {{resident_name}},\n\nWe are working through your maintenance request now. We will reply when the review is complete.\n\nThanks,\n{{manager_name}}",
  },
  {
    category: RequestCategory.VIOLATION,
    status: RequestStatus.NEEDS_INFO,
    title: "Violation · Needs info · Default",
    body: "Hi {{resident_name}},\n\nWe received your note. To review this against the governing documents, please share {{missing_info}}.\n\nThanks,\n{{manager_name}}",
    missingFields: ["unit_number", "rule_cited", "date_time", "supporting_details"],
  },
  {
    category: RequestCategory.VIOLATION,
    status: RequestStatus.OPEN,
    title: "Violation · Open · Default",
    body: "Hi {{resident_name}},\n\nWe received your note and will review it against the HOA policies and governing documents. We will follow up after the review. This acknowledgement is not a timeline or decision.\n\nThanks,\n{{manager_name}}",
  },
  {
    category: RequestCategory.VIOLATION,
    status: RequestStatus.IN_PROGRESS,
    title: "Violation · In progress · Default",
    body: "Hi {{resident_name}},\n\nWe are reviewing your note against HOA policies. No decision has been made yet. We will respond after the review.\n\nThanks,\n{{manager_name}}",
  },
  {
    category: RequestCategory.BILLING,
    status: RequestStatus.NEEDS_INFO,
    title: "Billing · Needs info · Default",
    body: "Hi {{resident_name}},\n\nWe received your billing question. Please share {{missing_info}} so we can review the account accurately.\n\nThanks,\n{{manager_name}}",
    missingFields: ["account_identifier"],
  },
  {
    category: RequestCategory.BILLING,
    status: RequestStatus.OPEN,
    title: "Billing · Open · Default",
    body: "Hi {{resident_name}},\n\nWe received your billing question and are reviewing the account details. We will follow up after review. This acknowledgement does not include a payment promise.\n\nThanks,\n{{manager_name}}",
  },
  {
    category: RequestCategory.BILLING,
    status: RequestStatus.IN_PROGRESS,
    title: "Billing · In progress · Default",
    body: "Hi {{resident_name}},\n\nWe are reviewing your billing question now. We will respond once the review is complete.\n\nThanks,\n{{manager_name}}",
  },
  {
    category: RequestCategory.BOARD,
    status: RequestStatus.NEEDS_INFO,
    title: "ARC/Board · Needs info · Default",
    body: "Hi {{resident_name}},\n\nWe received your ARC/board request. To review it, please provide {{missing_info}} (forms, lot number, and a short description).\n\nThanks,\n{{manager_name}}",
    missingFields: ["arc_form", "lot_number", "description"],
  },
  {
    category: RequestCategory.BOARD,
    status: RequestStatus.OPEN,
    title: "ARC/Board · Open · Default",
    body: "Hi {{resident_name}},\n\nWe received your ARC/board request and are reviewing it against the HOA policies. This acknowledgement is not an approval or timeline. We will follow up after review.\n\nThanks,\n{{manager_name}}",
  },
  {
    category: RequestCategory.BOARD,
    status: RequestStatus.IN_PROGRESS,
    title: "ARC/Board · In progress · Default",
    body: "Hi {{resident_name}},\n\nYour ARC/board request is under review. No decision has been made yet. We will reply after review.\n\nThanks,\n{{manager_name}}",
  },
  {
    category: RequestCategory.OTHER,
    status: RequestStatus.NEEDS_INFO,
    title: "Other · Needs info · Default",
    body: "Hi {{resident_name}},\n\nThanks for your message. Please share {{missing_info}} so we can understand and route this correctly.\n\nThanks,\n{{manager_name}}",
    missingFields: ["unit_number"],
  },
  {
    category: RequestCategory.OTHER,
    status: RequestStatus.OPEN,
    title: "Other · Open · Default",
    body: "Hi {{resident_name}},\n\nWe received your message and are reviewing it now. We will follow up after the review.\n\nThanks,\n{{manager_name}}",
  },
  {
    category: RequestCategory.OTHER,
    status: RequestStatus.IN_PROGRESS,
    title: "Other · In progress · Default",
    body: "Hi {{resident_name}},\n\nWe are working on your request now. We will respond when the review is complete.\n\nThanks,\n{{manager_name}}",
  },
];

// Fallback order: exact category+status -> category+OPEN when status missing -> GENERAL for same status -> GENERAL OPEN.
export function getSystemTemplate(category: RequestCategory, status: RequestStatus): SystemTemplate {
  const exact = MATRIX.find((tpl) => tpl.category === category && tpl.status === status);
  if (exact) return exact;

  const categoryOpen = MATRIX.find((tpl) => tpl.category === category && tpl.status === RequestStatus.OPEN);
  if (categoryOpen) return categoryOpen;

  const generalForStatus = MATRIX.find((tpl) => tpl.category === RequestCategory.GENERAL && tpl.status === status);
  if (generalForStatus) return generalForStatus;

  const generalOpen = MATRIX.find((tpl) => tpl.category === RequestCategory.GENERAL && tpl.status === RequestStatus.OPEN);
  if (generalOpen) return generalOpen;

  // This should never hit, but keep a guard.
  return {
    category: RequestCategory.GENERAL,
    status: RequestStatus.OPEN,
    title: "General · Open · Default",
    body: "Hi {{resident_name}},\n\nThanks for your message. We are reviewing it now.\n\nThanks,\n{{manager_name}}",
  };
}

export const SYSTEM_TEMPLATES = MATRIX;
