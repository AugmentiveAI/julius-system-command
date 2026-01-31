interface FlashOverlayProps {
  show: boolean;
}

export const FlashOverlay = ({ show }: FlashOverlayProps) => {
  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 bg-red-600/40"
      style={{
        animation: 'flash-fade 0.5s ease-out forwards',
      }}
    >
      <style>
        {`
          @keyframes flash-fade {
            0% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};
