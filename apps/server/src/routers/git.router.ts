import { publicProcedure } from '@/lib/orpc';
import { gitService } from '@/services/git';

export const gitRouter = {
  getRepositoryStatus: publicProcedure.handler(async () => {
    try {
      return await gitService.getRepositoryStatus();
    } catch (error) {
      console.error(
        'Git status failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return {
        isClean: true,
        staged: [],
        modified: [],
        untracked: [],
      };
    }
  }),

  getGitStatus: publicProcedure.handler(async () => {
    try {
      const repoStatus = await gitService.getRepositoryStatus();
      const remotes = await gitService.getRemotes();
      const currentBranch = await gitService.getCurrentBranch();

      return {
        branch: currentBranch,
        remotes,
        repository: repoStatus,
        hasRemote: remotes.length > 0,
        isClean: repoStatus.isClean,
      };
    } catch (error) {
      console.error(
        'Git status check failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return {
        branch: 'main',
        remotes: [],
        repository: {
          isClean: true,
          staged: [],
          modified: [],
          untracked: [],
        },
        hasRemote: false,
        isClean: true,
      };
    }
  }),
};