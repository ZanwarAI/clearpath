import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: "blue" | "yellow" | "green" | "red";
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    icon: "text-blue-500",
  },
  yellow: {
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    icon: "text-yellow-500",
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-600",
    icon: "text-green-500",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    icon: "text-red-500",
  },
};

export function StatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <Card className={colors.bg}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
          </div>
          <Icon className={`w-10 h-10 ${colors.icon}`} />
        </div>
      </CardContent>
    </Card>
  );
}
