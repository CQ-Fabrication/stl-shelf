import type { GitCommit } from '../../../../server/src/types/model';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate } from '@/utils/formatters';

type ModelGitHistoryProps = {
  history?: GitCommit[];
};

export const ModelGitHistory = ({ history }: ModelGitHistoryProps) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Git History</CardTitle>
        <CardDescription className="text-xs">Recent commits</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-32">
          {history && history.length > 0 ? (
            <div className="space-y-2 pr-2">
              {history.map((commit) => (
                <div className="rounded border p-2" key={commit.hash}>
                  <div className="mb-1 font-medium text-xs">
                    {commit.message}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {commit.author_name} • {formatDate(commit.date)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground text-sm">
              No git history available
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
