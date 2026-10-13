export function Card({
  children,
  className = "",
  hoverEffect = false,
  ...props
}) {
  return (
    <div
      className={`rounded-2xl border border-[#2B2B2B]/10 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/60 p-6 shadow-[0_8px_30px_rgb(10,10,10,0.04)] dark:shadow-[0_10px_30px_rgb(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 ${
        hoverEffect
          ? "hover:-translate-y-1 hover:border-[#1F5A3A]/30 dark:hover:border-[#D8FF2A]/30 hover:bg-white/85 dark:hover:bg-[#2B2B2B]/80 hover:shadow-[0_20px_40px_rgb(10,10,10,0.07)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.6)]"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
