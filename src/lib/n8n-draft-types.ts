export type HOAEmailInput = {
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt?: string;
  messageId?: string;
  threadId?: string;
};

export type HOAManagerContext = {
  hoaName: string;
  managerName: string;
  managerEmail: string;
};

export type N8nClassifyDraftResponse = {
  // classification shape is defined in n8n; left loose intentionally
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classification: any;
  draftReply: string;
  email: HOAEmailInput;
};
