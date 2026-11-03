
import { CallModal } from "./CallModalReal";
import { callSession, useCallSession } from "./callSession";

// Mounted once at the app root so an active call (full screen or minimised to
// the pill) keeps running while the person moves between screens.
export function CallHost({ accessToken }: { accessToken: string }) {
  const session = useCallSession();
  if (!session.mode || !session.match) return null;
  return (
    <CallModal
      mode={session.mode}
      match={session.match}
      isCoupleMode={session.isCoupleMode}
      accessToken={accessToken}
      callId={session.callId}
      isCaller={session.isCaller}
      minimized={session.minimized}
      onMinimizedChange={callSession.setMinimized}
      onClose={() => callSession.end()}
    />
  );
}
