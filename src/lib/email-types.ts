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
