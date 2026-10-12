import { Compass } from 'lucide-react';
import { Empty } from '../../components/ui/Feedback.jsx';
import { Button } from '../../components/ui/Button.jsx';

export default function NotFound() {
  return (
    <div className="container py-16">
      <Empty icon={Compass} title="Page not found" text="The page you're looking for doesn't exist or has moved." action={<Button to="/">Back to home</Button>} />
    </div>
  );
}
