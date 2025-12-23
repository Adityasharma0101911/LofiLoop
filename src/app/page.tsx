import { ThemeProvider } from "@/components/ThemeProvider";
import LoopWorkstation from "@/components/LoopWorkstation";

export default function Home() {
  return (
    <ThemeProvider>
      <LoopWorkstation />
    </ThemeProvider>
  );
}
