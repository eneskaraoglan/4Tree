import { useLocalSearchParams } from 'expo-router';

import { PostComposerScreen } from '@/features/feed/PostComposerScreen';

export default function PostComposerRoute() {
  const { runId } = useLocalSearchParams<{ runId?: string }>();

  return <PostComposerScreen initialRunId={runId} />;
}
