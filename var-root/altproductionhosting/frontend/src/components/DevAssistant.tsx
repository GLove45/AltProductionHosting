import { ReactNode } from 'react';

type DevAssistantProps = {
  devMode: boolean;
  children: ReactNode;
  message: string;
};

export const DevAssistant = ({ devMode, children, message }: DevAssistantProps) => {
  return (
    <section className="dev-assistant">
      {!devMode && <aside className="assistant-message">{message}</aside>}
      <div className="assistant-content">{children}</div>
    </section>
  );
};
