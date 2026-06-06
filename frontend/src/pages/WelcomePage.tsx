import { type UserResponse } from "../api/auth";
import { Button } from "../components/ui/Button";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { GlassPanel } from "../components/ui/GlassPanel";
import { PageShell } from "../components/ui/PageShell";
import { StepIndicator } from "../components/ui/StepIndicator";

type WelcomePageProps = {
  user: UserResponse;
  isLoading: boolean;
  errorMessage: string | null;
  onContinue: () => void;
};

export function WelcomePage({
  isLoading,
  errorMessage,
  onContinue,
}: WelcomePageProps) {
  return (
    <PageShell>
      <GlassPanel className="game-panel welcome-panel">
        <StepIndicator current={1} total={5} />
        <p className="brand-line">VLADBLOG COLLECTIBLES</p>
        <h1>Твоя AI-фигурка в коллекции VladBlog</h1>
        <p className="lead">
          Преврати свою индивидуальность в коллекционную фигурку со своим
          номером, редкостью, стилем и образом и поделись ей с другими. Здесь
          каждый сможет собрать коллекцию из своих друзей, знакомых или вообще
          незнакомых людей.
        </p>
        {errorMessage && <ErrorMessage message={errorMessage} />}
        <Button
          isLoading={isLoading}
          loadingText="Создаём..."
          onClick={onContinue}
        >
          Поделиться своей индивидуальностью
        </Button>
      </GlassPanel>
    </PageShell>
  );
}
