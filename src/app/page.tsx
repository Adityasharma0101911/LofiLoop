import { ThemeProvider } from "@/components/ThemeProvider";
import BeatMaker from "@/components/BeatMaker";

export default function Home() {
  return (
    <ThemeProvider>
      <BeatMaker />
    </ThemeProvider>
  );
}
