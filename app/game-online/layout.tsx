export default function GameOnlineLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <style dangerouslySetInnerHTML={{ __html: `
        html, body { overflow: hidden !important; }
        .ludo-live-wrapper .ludo-live-container { min-height: 0 !important; }
        .ludo-live-wrapper .ll-board-stage {
          min-height: 0 !important;
          min-width: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .ludo-live-wrapper .ll-board-frame {
          box-sizing: border-box !important;
          width: auto !important;
          height: min(100%, 680px) !important;
          max-width: 100% !important;
          max-height: 100% !important;
          aspect-ratio: 1 / 1 !important;
          flex: 0 1 auto !important;
          margin-inline: auto !important;
        }
        @media (max-width: 700px) {
          .ludo-live-wrapper .ll-board-frame {
            width: auto !important;
            height: min(100%, 680px) !important;
            max-width: 100% !important;
            max-height: 100% !important;
            flex: 0 1 auto !important;
          }
        }
      ` }} />
    </>
  );
}
