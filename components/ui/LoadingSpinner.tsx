import Image from "next/image";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export default function LoadingSpinner({ 
  size = 64, 
  className = "" 
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative animate-bounce">
        <div className="animate-[spin_3s_linear_infinite]">
          <Image
            src="/images/cow.png"
            alt="Loading..."
            width={size}
            height={size}
            className="object-contain"
            priority
          />
        </div>
      </div>
      <p className="text-sm font-medium text-primary animate-pulse">
        লোডিং হচ্ছে...
      </p>
    </div>
  );
}
